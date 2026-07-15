import { GuestListPage } from "@/components/GuestListPage";

export default function VmsPage() {
  return (
    <GuestListPage type="qemu" title="Virtuelle Maschinen" breadcrumb={["Start", "Virtuelle Maschinen"]} />
  );
}
