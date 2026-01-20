import bpy
import bmesh

# 1. 활성화된 메쉬 오브젝트 가져오기
obj = bpy.context.active_object

if obj is None or obj.type != 'MESH':
    print("메쉬 오브젝트를 선택해주세요.")
else:
    # 에디트 모드로 전환
    bpy.ops.object.mode_set(mode='EDIT')

    # BMesh 데이터 생성
    bm = bmesh.from_edit_mesh(obj.data)
    bm.verts.ensure_lookup_table()

    # 2. 메쉬 아일랜드(분리된 조각들) 감지
    def get_islands(bm):
        visited = set()
        islands = []
        for v in bm.verts:
            if v not in visited:
                # 새 아일랜드 발견
                island = []
                stack = [v]
                visited.add(v)
                while stack:
                    curr = stack.pop()
                    island.append(curr)
                    for edge in curr.link_edges:
                        other = edge.other_vert(curr)
                        if other not in visited:
                            visited.add(other)
                            stack.append(other)
                islands.append(island)
        return islands

    islands = get_islands(bm)
    print(f"감지된 조각 개수: {len(islands)}")

    # 3. 각 조각의 첫 번째 정점끼리 선(Edge)으로 연결
    if len(islands) > 1:
        for i in range(len(islands) - 1):
            vert1 = islands[i][0]      # i번째 조각의 정점
            vert2 = islands[i+1][0]    # i+1번째 조각의 정점

            # 이미 선이 있는지 확인 후 없으면 생성
            if not bm.edges.get((vert1, vert2)):
                bm.edges.new((vert1, vert2))

        print(f"{len(islands)-1}개의 연결선이 생성되었습니다.")
    else:
        print("이미 모든 메쉬가 연결되어 있습니다.")

    # 4. 변경사항 적용 및 화면 갱신
    bmesh.update_edit_mesh(obj.data)
    bpy.ops.object.mode_set(mode='OBJECT')
