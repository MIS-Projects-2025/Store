import Dropdown from "@/Components/sidebar/DropDown";
import SidebarLink from "@/Components/sidebar/SidebarLink";
import { usePage, router } from "@inertiajs/react";
import { useState, useEffect } from "react";
import {
  HiSquares2X2,
  HiFolder,
  HiCube,
  HiInboxStack,
  HiClipboard,
  HiArrowUpTray,
  HiArrowDownTray,
  HiShoppingCart,
  HiCheckCircle,
  HiUsers,
  HiUserGroup,
  HiChartBar,
} from "react-icons/hi2";

export default function NavLinks() {
    const { emp_data } = usePage().props;
    const [pendingConsumables, setPendingConsumables] = useState(0);
    const [pendingSupplies, setPendingSupplies]       = useState(0);
    const [pendingConsigned, setPendingConsigned]     = useState(0);

    const userType = emp_data?.emp_jobtitle?.toLowerCase() || '';
    const isAdministrator = emp_data?.emp_station == 1 && emp_data?.emp_jobtitle === "Store User";

    const canView = (allowedUsers) => {
        if (isAdministrator && allowedUsers.includes('administrator')) return true;
        if (userType.includes('consigned')) return allowedUsers.includes('consigned');
        if (userType.includes('store')) return allowedUsers.includes('store');
        return allowedUsers.includes('employee');
    };

    const fetchPendingCount = async () => {
        try {
            const response = await fetch(route('material-issuance.pending-count'));
            const data = await response.json();
            setPendingConsumables(data.pendingConsumables ?? 0);
            setPendingSupplies(data.pendingSupplies ?? 0);
            setPendingConsigned(data.pendingConsigned ?? 0);
        } catch (error) {
            console.error('Error fetching pending count:', error);
        }
    };

    useEffect(() => {
        if (canView(['store', 'administrator'])) {
            fetchPendingCount();
            const interval = setInterval(fetchPendingCount, 30000);
            return () => clearInterval(interval);
        }
    }, []);

    useEffect(() => {
        if (canView(['store', 'administrator'])) {
            const removeListener = router.on('success', () => {
                fetchPendingCount();
            });
            return removeListener;
        }
    }, []);

    const iconClass = "w-5 h-5";

    // Build the badge string — only include parts with a non-zero count
    const totalPending = pendingConsumables + pendingSupplies + pendingConsigned;
    const badgeLabel = [
        pendingConsumables > 0 && `CS:${pendingConsumables}`,
        pendingSupplies > 0    && `S:${pendingSupplies}`,
        pendingConsigned > 0   && `C:${pendingConsigned}`,
    ].filter(Boolean).join(" ");

    const navItems = [
        {
            type: 'link',
            show: canView(['employee', 'consigned', 'store', 'administrator']),
            href: route("dashboard"),
            label: "Dashboard",
            icon: <HiSquares2X2 className={iconClass} />,
        },
        {
            type: 'link',
            show: canView(['store', 'administrator']),
            href: route("material-issuance"),
            label: "Material Issuance",
            icon: <HiArrowUpTray className={iconClass} />,
            // String badge → "CS:3 S:1 C:2" | empty string when nothing pending
            badge: totalPending > 0 ? badgeLabel : "",
        },
        {
            type: 'dropdown',
            show: canView(['store', 'administrator']),
            label: "Manage Material",
            icon: <HiFolder className={iconClass} />,
            notifications: true,
            links: [
                {
                    show: canView(['store', 'administrator']),
                    href: route("consumable"),
                    label: "Consumable & Spares",
                    icon: <HiCube className={iconClass} />,
                },
                {
                    show: canView(['store', 'administrator']),
                    href: route("supplies"),
                    label: "Supplies",
                    icon: <HiInboxStack className={iconClass} />,
                },
                {
                    show: canView(['store', 'administrator']),
                    href: route("consigned"),
                    label: "Consigned",
                    icon: <HiClipboard className={iconClass} />,
                },
            ],
        },
        {
            type: 'link',
            show: canView(['store', 'administrator']),
            href: route("export"),
            label: "Export",
            icon: <HiArrowDownTray className={iconClass} />,
        },
        {
            type: 'link',
            show: canView(['store','employee', 'consigned']),
            href: route("order-material"),
            label: "Order Material",
            icon: <HiShoppingCart className={iconClass} />,
        },
        {
            type: 'link',
            show: canView(['store','employee', 'consigned']),
            href: route("order-monitor"),
            label: "Order Monitor",
            icon: <HiChartBar className={iconClass} />,
        },
        {
            type: 'link',
            show: canView(['employee', 'store']) && emp_data?.emp_position != 1,
            href: route("approval"),
            label: "Approval Request",
            icon: <HiCheckCircle className={iconClass} />,
        },
        {
            type: 'link',
            show: canView(['administrator']),
            href: route("adminUser"),
            label: "Administrator List",
            icon: <HiUsers className={iconClass} />,
        },
        {
            type: 'link',
            show: canView(['administrator']),
            href: route("consignedUser"),
            label: "Consigned User",
            icon: <HiUserGroup className={iconClass} />,
        },

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
                        notifications={item.badge ?? item.notifications ?? 0}
                    />
                );
            })}
        </nav>
    );
}