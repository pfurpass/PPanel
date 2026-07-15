import { GuestListPage } from "@/components/GuestListPage";

export default function ContainersPage() {
  return <GuestListPage type="lxc" title="Container" breadcrumb={["Start", "Container"]} />;
}
