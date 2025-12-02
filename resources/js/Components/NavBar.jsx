// ========== NavBar.jsx ==========
import { Link, usePage, router } from "@inertiajs/react";
import { useState, useEffect } from "react";

export default function NavBar() {
    const { emp_data } = usePage().props;
    const [theme, setTheme] = useState("light");

    useEffect(() => {
        const storedTheme = localStorage.getItem("theme") || "light";
        setTheme(storedTheme);
        
        // Listen for theme changes
        const interval = setInterval(() => {
            const currentTheme = localStorage.getItem("theme") || "light";
            if (currentTheme !== theme) {
                setTheme(currentTheme);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [theme]);

const logout = () => {
    const token = localStorage.getItem("authify-token") || '';
    
   
    localStorage.clear();
    sessionStorage.clear();
    

    const timestamp = Date.now();
    const currentUrl = encodeURIComponent(window.location.href);
    
    window.location.href = `http://192.168.2.221/authify/public/logout?token=${encodeURIComponent(
        token
    )}&redirect=${currentUrl}&t=${timestamp}`;
};

    const isDark = theme === "dark";

    return (
        <nav className={`border-b shadow-sm transition-colors ${
            isDark 
                ? "bg-gray-800 border-gray-700" 
                : "bg-white border-gray-200"
        }`}>
            <div className="px-4 mx-auto sm:px-6 lg:px-8">
                <div className="flex justify-end h-[60px]">
                    <div className="items-center hidden mr-5 space-x-1 font-semibold md:flex">
                        <div className="dropdown dropdown-end">
                            <div
                                tabIndex={0}
                                role="button"
                                className={`flex items-center m-1 space-x-2 cursor-pointer select-none px-3 py-2 rounded-lg transition-colors ${
                                    isDark 
                                        ? "hover:bg-gray-700" 
                                        : "hover:bg-gray-100"
                                }`}
                            >
                                <div className="w-8 h-8 rounded-full bg-[#8549a7] flex items-center justify-center text-white font-semibold">
                                    {emp_data?.emp_firstname?.charAt(0).toUpperCase()}
                                </div>
                                <span className={`mt-[3px] ${
                                    isDark ? "text-gray-200" : "text-gray-700"
                                }`}>
                                    Hello, {emp_data?.emp_firstname}
                                </span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                    className={`w-4 h-4 ${
                                        isDark ? "text-gray-400" : "text-gray-500"
                                    }`}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="m19.5 8.25-7.5 7.5-7.5-7.5"
                                    />
                                </svg>
                            </div>

                            <ul
                                tabIndex={0}
                                className={`p-2 shadow-lg dropdown-content menu rounded-lg z-50 w-52 border ${
                                    isDark 
                                        ? "bg-gray-800 border-gray-700" 
                                        : "bg-white border-gray-200"
                                }`}
                            >
                                <li>
                                    <a 
                                        href={route("profile.index")}
                                        className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                                            isDark 
                                                ? "text-gray-200 hover:bg-gray-700" 
                                                : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth="1.5"
                                            stroke="currentColor"
                                            className="w-5 h-5"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                                            />
                                        </svg>
                                        <span>Profile</span>
                                    </a>
                                </li>
                                <li>
                                    <button 
                                        onClick={logout}
                                        className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors w-full ${
                                            isDark
                                                ? "text-red-400 hover:bg-red-900/20"
                                                : "text-red-600 hover:bg-red-50"
                                        }`}
                                    >
                                        <svg
                                            className="w-5 h-5"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth="1.5"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
                                            />
                                        </svg>
                                        <span>Log out</span>
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}