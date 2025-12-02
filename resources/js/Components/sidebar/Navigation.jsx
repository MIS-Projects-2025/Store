import Dropdown from "@/Components/sidebar/Dropdown";
import SidebarLink from "@/Components/sidebar/SidebarLink";
import { usePage } from "@inertiajs/react";

// React Icons (Heroicons v2)
import { HiSquares2X2, HiFolderOpen, HiUsers, HiCube, HiArchiveBox, HiClipboardDocumentList } from "react-icons/hi2";


export default function NavLinks() {
    const { emp_data } = usePage().props;

    return (
        <nav
            className="flex flex-col flex-grow space-y-1 overflow-y-auto"
            style={{ scrollbarWidth: "none" }}
        >
            {/* Dashboard */}
            <SidebarLink
                href={route("dashboard")}
                label="Dashboard"
                icon={<HiSquares2X2 className="w-5 h-5" />}
                notifications={5}
            />

            {/* Manage Material */}
            <Dropdown
                label="Manage Material"
                icon={<HiFolderOpen className="w-5 h-5" />}
                links={[
                    {
                        href: route("consumable"),
                        label: "Consumable",
                        icon: <HiCube className="w-5 h-5" />,
                    },
                    {
                        href: route("supplies"),
                        label: "Supplies",
                        icon: <HiArchiveBox className="w-5 h-5" />,
                    },
                    {
                        href: route("dashboard"),
                        label: "Consigned",
                        icon: <HiClipboardDocumentList className="w-5 h-5" />,
                    },
                ]}
                notifications={true}
            />

            {/* Dashboard */}
            <SidebarLink
                href={route("dashboard")}
                label="Dashboard"
                icon={<HiSquares2X2 className="w-5 h-5" />}
                notifications={5}
            />

            {/* Admin Page – only for superadmin/admin */}
            {["superadmin", "admin"].includes(emp_data?.emp_system_role) && (
                <SidebarLink
                    href={route("admin")}
                    label="Administrators"
                    icon={<HiUsers className="w-5 h-5" />}
                />
            )}
        </nav>
    );
}
