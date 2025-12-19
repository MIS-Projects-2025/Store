import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import { useState } from "react";

export default function Dashboard({ lowConsumables = [], lowSupplies = [] }) {
    const [activeTab, setActiveTab] = useState("tab1");

    const cards = [
        {
            title: "CONSUMABLE",
            count: lowConsumables.length,
            color: "success",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            )
        },
        {
            title: "SUPPLIES",
            count: lowSupplies.length,
            color: "warning",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
            )
        },
        {
            title: "CONSIGNED",
            count: 0,
            color: "info",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            )
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />
            
            <div className="py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {cards.map((card, index) => (
                            <div key={index} className="card bg-base-100 shadow">
                                <div className="card-body">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="card-title">{card.title}</h2>
                                            <p className="text-3xl font-bold mt-2">{card.count}</p>
                                        </div>
                                        <div className={`text-${card.color}`}>
                                            {card.icon}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Main Card with Tabs */}
                    <div className="card bg-base-100 shadow">
                        <div className="card-body">
                            <h2 className="card-title mb-4">List of Low Materials</h2>
                            
                            {/* DaisyUI Tabs */}
                            <div className="tabs tabs-boxed">
                                <a 
                                    className={`tab ${activeTab === "tab1" ? "tab-active" : ""}`}
                                    onClick={() => setActiveTab("tab1")}
                                >
                                    Consumables ({lowConsumables.length})
                                </a>
                                <a 
                                    className={`tab ${activeTab === "tab2" ? "tab-active" : ""}`}
                                    onClick={() => setActiveTab("tab2")}
                                >
                                    Supplies ({lowSupplies.length})
                                </a>
                            </div>

                            {/* Tab Content */}
                            <div className="mt-6">
                                {activeTab === "tab1" && (
                                    <div className="overflow-x-auto">
                                        <table className="table table-zebra">
                                            <thead>
                                                <tr>
                                                    <th>Item Code</th>
                                                    <th>Material Description</th>
                                                    <th>Quantity</th>
                                                    <th>Minimum</th>
                                                    <th>UOM</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {lowConsumables.length > 0 ? (
                                                    lowConsumables.map((item) => (
                                                        <tr key={item.id}>
                                                            <td>{item.Itemcode}</td>
                                                            <td>{item.mat_description}</td>
                                                            <td>
                                                                <span className={`${
                                                                    item.qty <= item.minimum / 2 
                                                                        ? 'text-red-600 font-bold' 
                                                                        : 'text-yellow-600 font-semibold'
                                                                }`}>
                                                                    {parseFloat(item.qty).toFixed(2)}
                                                                </span>
                                                            </td>
                                                            <td>{parseFloat(item.minimum).toFixed(2)}</td>
                                                            <td>{item.uom}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="5" className="text-center text-gray-500">
                                                            No low stock items found
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {activeTab === "tab2" && (
                                    <div className="overflow-x-auto">
                                        <table className="table table-zebra">
                                            <thead>
                                                <tr>
                                                    <th>Item Code</th>
                                                    <th>Material Description</th>
                                                    <th>Quantity</th>
                                                    <th>Minimum</th>
                                                    <th>UOM</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {lowSupplies.length > 0 ? (
                                                    lowSupplies.map((item) => (
                                                        <tr key={item.id}>
                                                            <td>{item.itemcode}</td>
                                                            <td>{item.material_description}</td>
                                                            <td>
                                                                <span className={`${
                                                                    item.qty <= item.minimum / 2 
                                                                        ? 'text-red-600 font-bold' 
                                                                        : 'text-yellow-600 font-semibold'
                                                                }`}>
                                                                    {parseFloat(item.qty).toFixed(2)}
                                                                </span>
                                                            </td>
                                                            <td>{parseFloat(item.minimum).toFixed(2)}</td>
                                                            <td>{item.uom}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="5" className="text-center text-gray-500">
                                                            No low stock items found
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}