import React from "react";
import { Link, usePage } from "@inertiajs/react";

const SidebarLink = ({
    href,
    label,
    icon,
    notifications = 0,
}) => {
    const { url } = usePage();

    const isActive = url === new URL(href, window.location.origin).pathname;

    return (
        <Link
            href={href}
            className={`relative flex justify-between px-4 py-1 pl-[10px] transition-colors duration-150 rounded-md ${
                isActive ? "bg-white/20" : ""
            } hover:bg-white/10`}
        >
            <div className="flex items-center">
                <span className="w-6 h-6 pt-[2px]">{icon}</span>
                <p className="pl-1 pt-[1px]">{label}</p>
            </div>

            <div>
                {notifications > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 ml-2 text-xs leading-none text-white bg-red-600 rounded-md">
                        {notifications}
                    </span>
                )}
            </div>
        </Link>
    );
};

export default SidebarLink;
