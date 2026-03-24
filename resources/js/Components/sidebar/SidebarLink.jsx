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

    // Support both numeric badges (e.g. 5) and string badges (e.g. "CS:3 S:1 C:2")
    const isStringBadge = typeof notifications === "string" && notifications.trim() !== "";
    const isNumericBadge = typeof notifications === "number" && notifications > 0;
    const hasBadge = isStringBadge || isNumericBadge;

    // For string badges, split into individual pills (e.g. ["CS:3", "S:1", "C:2"])
    const badgePills = isStringBadge
        ? notifications.trim().split(/\s+/)
        : null;

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
                {/* Numeric badge — single red pill */}
                {isNumericBadge && (
                    <span className="inline-flex items-center justify-center px-2 py-1 ml-2 text-xs leading-none text-white bg-red-600 rounded-md">
                        {notifications}
                    </span>
                )}

                {/* String badge — one purple pill per part */}
                {isStringBadge && (
                    <span className="flex items-center gap-1 ml-2">
                        {badgePills.map((pill) => (
                            <span
                                key={pill}
                                className="inline-flex items-center justify-center px-1.5 py-0.5 text-white bg-purple-600 rounded-md leading-none"
                                style={{ fontSize: "10px", fontWeight: 700 }}
                            >
                                {pill}
                            </span>
                        ))}
                    </span>
                )}
            </div>
        </Link>
    );
};

export default SidebarLink;