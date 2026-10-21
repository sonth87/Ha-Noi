/* The hand-drawn structures of the crossroads (docs/architecture/components.md C1–C3, B), as data
   for the "Công trình" page: what each one is, where it stands, what it is drawn from. Pure. */
import type { PlotKind } from '@core/crossroads';

export type LandmarkKind = PlotKind | 'flyover';

export interface Landmark {
  id: string;
  kind: LandmarkKind;
  name: string;
  /** where it is at the crossroads */
  place: string;
  /** numbers: floors, heights, sizes as drawn */
  facts: string[];
  /** what makes it recognisable, as drawn */
  features: string[];
}

export const LANDMARKS: readonly Landmark[] = [
  {
    id: 'thai-binh',
    kind: 'thai-binh',
    name: 'Tòa Thái Bình (Việt Tower, Parkson cũ)',
    place: 'Góc tây bắc: Thái Hà × Tây Sơn, phía Ngã Tư Sở',
    facts: ['18 tầng: đế 11 tầng (4 m/tầng) + tháp tới tầng 18 (3.6 m/tầng); cao ≈ 69 m, tới đỉnh ăng-ten ≈ 82 m', 'Dài ≈ 108 m dọc Thái Hà, rộng ≈ 47 m', 'Mặt bằng: OpenStreetMap (way 136257265)'],
    features: [
      'Khối đế 11 tầng: cánh dài đầu tròn chạy lên Thái Hà, khối nêm thon tới mũi tròn hướng ra Tây Sơn',
      'Tháp 18 tầng giữa hai khối, mặt thẳng sát Thái Hà, đầu tròn quay về khối nêm',
      'Mỗi tầng một dải kính ngang liền quanh khối',
      'Mái tháp: phòng kỹ thuật, cột ăng-ten khung, đèn báo máy bay nhấp nháy ban đêm',
      'Không vẽ biển tên, logo (A9)',
    ],
  },
  {
    id: 'novotel',
    kind: 'novotel',
    name: 'Novotel Thái Hà',
    place: 'Góc đông bắc: Thái Hà × Tây Sơn, phía Ô Chợ Dừa',
    facts: ['27 tầng: đế 5 tầng (4.2 m/tầng) + tháp (3 m/tầng); cao ≈ 87 m; 343 phòng', 'Dài ≈ 84 m dọc Thái Hà, rộng ≈ 38 m', 'Mặt bằng: OpenStreetMap (way 850419282)'],
    features: [
      'Tháp kính hình chữ nhật, góc về phía ngã tư vuốt cong lớn',
      'Hai dải trắng bậc thang kẹp hai đầu mặt cong, tới tầng 24',
      'Đế 5 tầng trắng: phần trước dưới tháp và cánh chữ L phía sau, có đuôi hẹp chạy lên Thái Hà',
      'Bể bơi và ghế nằm trên mái cánh',
      'Kính dùng màu tối của bảng màu (không có xanh dương); không logo (A9)',
    ],
  },
  {
    id: 'garden-circle',
    kind: 'garden-circle',
    name: 'Vườn hoa tròn',
    place: 'Góc tây nam: Tây Sơn × Chùa Bộc',
    facts: ['Lô 40 × 38 m', 'Quảng trường Ø 10.8 m, lối vòng Ø 19–22 m'],
    features: [
      'Bồn hoa 2 tầng giữa quảng trường',
      'Lối vòng, 4 lối ra 4 cạnh và 1 lối về góc ngã tư',
      'Ghế đá và đèn vườn xen kẽ trên lối vòng; đèn sáng ban đêm',
      'Cây to, vừa trên các mảng cỏ; hàng rào cây thấp, hở ở chỗ lối ra',
    ],
  },
  {
    id: 'garden-grove',
    kind: 'garden-grove',
    name: 'Vườn cây rậm',
    place: 'Góc đông nam: Tây Sơn × Chùa Bộc',
    facts: ['Lô 40 × 38 m'],
    features: [
      'Cây dày theo lưới so le, tán gần như liền nhau',
      'Một lối đi uốn khúc từ góc ngã tư xuyên vườn, thêm một nhánh',
      'Ghế và đèn vườn dọc lối',
      'Hàng rào cây thấp quanh vườn',
    ],
  },
  {
    id: 'flyover',
    kind: 'flyover',
    name: 'Cầu vượt Tây Sơn & nút giao',
    place: 'Giữa ngã tư, dọc Tây Sơn',
    facts: ['Mặt cầu cao 6 m, dốc 28 m mỗi bên', 'Tây Sơn 16 m lòng đường, 4 làn + dải phân cách', 'Chu kỳ đèn 39 s (xanh 14/11 s, vàng 3 s, đỏ toàn phần 4 s)'],
    features: [
      'Hai làn trong của Tây Sơn lên dốc đắp có tường chắn, vắt qua ngã tư trên trụ ở dải phân cách',
      'Chỉ ô tô được lên cầu (xe máy không)',
      'Nút giao: vạch sang đường 4 phía, vạch dừng, bó vỉa sơn sọc ở 4 góc',
      'Đèn giao thông 4 mặt có số đếm ngược ở mỗi góc',
    ],
  },
];
