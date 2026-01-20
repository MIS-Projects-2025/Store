import Dropdown from "@/Components/sidebar/Dropdown";
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
} from "react-icons/hi2";

export default function NavLinks() {
    const { emp_data } = usePage().props;
    const [pendingCount, setPendingCount] = useState(0);
    
    // Get user type from job title
    const userType = emp_data?.emp_jobtitle?.toLowerCase() || '';
    
    // Check if user is administrator
    const isAdministrator = emp_data?.emp_station == 1 && emp_data?.emp_jobtitle === "Store User";

    // Simple access check
    const canView = (allowedUsers) => {
        // Administrator has access to everything
        if (isAdministrator && allowedUsers.includes('administrator')) return true;
        
        if (userType.includes('consigned')) return allowedUsers.includes('consigned');
        if (userType.includes('store')) return allowedUsers.includes('store');
        return allowedUsers.includes('employee');
    };

    // Fetch pending count
    const fetchPendingCount = async () => {
        try {
            const response = await fetch(route('material-issuance.pending-count'));
            const data = await response.json();
            setPendingCount(data.total);
        } catch (error) {
            console.error('Error fetching pending count:', error);
        }
    };

    // Poll for updates every 30 seconds
    useEffect(() => {
        if (canView(['store', 'administrator'])) {
            fetchPendingCount();
            const interval = setInterval(fetchPendingCount, 30000); // 30 seconds
            return () => clearInterval(interval);
        }
    }, []);

    // Listen for Inertia page visits to refresh count
    useEffect(() => {
        if (canView(['store', 'administrator'])) {
            const removeListener = router.on('success', () => {
                fetchPendingCount();
            });
            return removeListener;
        }
    }, []);

    const iconClass = "w-5 h-5";

    // Navigation configuration
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
            badge: pendingCount > 0 ? pendingCount : null,
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
            show: canView(['employee', 'consigned']),
            href: route("order-material"),
            label: "Order Material",
            icon: <HiShoppingCart className={iconClass} />,
        },
        {
            type: 'link',
            show: canView(['employee']) && emp_data?.emp_position != 1,
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
                        notifications={item.badge || 0}
                    />
                );
            })}
        </nav>
    );
}