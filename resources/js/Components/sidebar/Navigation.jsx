import Dropdown from "@/Components/sidebar/Dropdown";
import SidebarLink from "@/Components/sidebar/SidebarLink";
import { usePage } from "@inertiajs/react";
import { HiSquares2X2, HiFolderOpen, HiCube, HiArchiveBox, HiClipboardDocumentList } from "react-icons/hi2";

export default function NavLinks() {
    const { emp_data } = usePage().props;
    
    // Get user type from job title
    const userType = emp_data?.emp_jobtitle?.toLowerCase() || '';

    // Simple access check
    const canView = (allowedUsers) => {
        if (userType.includes('consigned')) return allowedUsers.includes('consigned');
        if (userType.includes('store')) return allowedUsers.includes('store');
        return allowedUsers.includes('employee');
    };

    // Navigation configuration
    const navItems = [
        {
            type: 'link',
            show: canView(['employee', 'consigned', 'store']),
            href: route("dashboard"),
            label: "Dashboard",
            icon: <HiSquares2X2 className="w-5 h-5" />
        },
        {
            type: 'link',
            show: canView(['store']),
            href: route("material-issuance"),
            label: "Material Issuance",
            icon: <HiSquares2X2 className="w-5 h-5" />
        },
        {
            type: 'dropdown',
            show: canView(['store']),
            label: "Manage Material",
            icon: <HiFolderOpen className="w-5 h-5" />,
            notifications: true,
            links: [
                {
                    show: canView(['store']),
                    href: route("consumable"),
                    label: "Consumable & Spares",
                    icon: <HiCube className="w-5 h-5" />
                },
                {
                    show: canView(['store']),
                    href: route("supplies"),
                    label: "Supplies",
                    icon: <HiArchiveBox className="w-5 h-5" />
                },
                {
                    show: canView(['store']),
                    href: route("consigned"),
                    label: "Consigned",
                    icon: <HiClipboardDocumentList className="w-5 h-5" />
                }
            ]
        },
        {
            type: 'link',
            show: canView(['employee', 'store', 'consigned']),
            href: route("order-material"),
            label: "Order Material",
            icon: <HiSquares2X2 className="w-5 h-5" />
        },
        {
            type: 'link',
            show: canView(['employee']) && emp_data?.emp_position != 1,
            href: route("approval"),
            label: "Approval Request",
            icon: <HiSquares2X2 className="w-5 h-5" />
        }
    ];

    return (
        <nav className="flex flex-col flex-grow space-y-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {navItems.map((item, index) => {
                if (!item.show) return null;

                if (item.type === 'dropdown') {
                    const visibleLinks = item.links.filter(link => link.show);
                    if (visibleLinks.length === 0) return null;

                    return (
                        <Dropdown
                            key={index}
                            label={item.label}
                            icon={item.icon}
                            links={visibleLinks}
                            notifications={item.notifications}
                        />
                    );
                }

                return (
                    <SidebarLink
                        key={index}
                        href={item.href}
                        label={item.label}
                        icon={item.icon}
                    />
                );
            })}
        </nav>
    );
}