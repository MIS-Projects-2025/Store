import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage } from "@inertiajs/react";
import { useState } from "react";

export default function OrderMaterial({ tableData, tableFilters }) {
    const props = usePage().props;
    const emp_data = props.emp_data;
    const [selectedApprover, setSelectedApprover] = useState("");
    const [activeTab, setActiveTab] = useState("consumable");
    const [selectedSupplyDetails, setSelectedSupplyDetails] = useState({});
    const [selectedConsignedSuppliers, setSelectedConsignedSuppliers] = useState({});
    const [consumableSearch, setConsumableSearch] = useState("");
    const [suppliesSearch, setSuppliesSearch] = useState("");
    const [consignedSearch, setConsignedSearch] = useState("");
    const [employeeId, setEmployeeId] = useState("");
    const [selectedFactory, setSelectedFactory] = useState("");

    // Mock data for consumable items
    const mockConsumableData = [
        { itemCode: "ITEM001", description: "Bearing", detailedDescription: "Ball bearing 6205-2RS", serial: "SN12345", quantity: 10, uom: "PCS" },
        { itemCode: "ITEM001", description: "Bearing", detailedDescription: "Ball bearing 6205-2RS", serial: "SN12346", quantity: 10, uom: "PCS" },
        { itemCode: "ITEM001", description: "Bearing", detailedDescription: "Ball bearing 6205-2RS", serial: "SN12347", quantity: 10, uom: "PCS" },
        { itemCode: "ITEM002", description: "Motor Oil", detailedDescription: "SAE 10W-40 Synthetic Motor Oil", serial: "-", quantity: 5, uom: "LTR" },
        { itemCode: "ITEM003", description: "V-Belt", detailedDescription: "Industrial V-Belt A-Section 1/2\" x 50\"", serial: "VB-789", quantity: 3, uom: "PCS" },
        { itemCode: "ITEM003", description: "V-Belt", detailedDescription: "Industrial V-Belt A-Section 1/2\" x 50\"", serial: "VB-790", quantity: 3, uom: "PCS" },
        { itemCode: "ITEM004", description: "Hydraulic Hose", detailedDescription: "High pressure hydraulic hose 1/2\" x 10m", serial: "HH-2024-001", quantity: 2, uom: "MTR" },
        { itemCode: "ITEM005", description: "Grease", detailedDescription: "Lithium-based multi-purpose grease", serial: "-", quantity: 8, uom: "KG" },
        { itemCode: "ITEM006", description: "Air Filter", detailedDescription: "Heavy duty air filter AF-2500", serial: "AF-001", quantity: 15, uom: "PCS" },
        { itemCode: "ITEM006", description: "Air Filter", detailedDescription: "Heavy duty air filter AF-2500", serial: "AF-002", quantity: 15, uom: "PCS" },
        { itemCode: "ITEM006", description: "Air Filter", detailedDescription: "Heavy duty air filter AF-2500", serial: "AF-003", quantity: 15, uom: "PCS" },
        { itemCode: "ITEM007", description: "Coolant", detailedDescription: "Industrial coolant concentrate 50/50 mix", serial: "-", quantity: 20, uom: "LTR" },
        { itemCode: "ITEM008", description: "Drive Chain", detailedDescription: "Roller chain 40-1 x 10ft", serial: "DC-445", quantity: 4, uom: "PCS" },
        { itemCode: "ITEM008", description: "Drive Chain", detailedDescription: "Roller chain 40-1 x 10ft", serial: "DC-446", quantity: 4, uom: "PCS" },
        { itemCode: "ITEM009", description: "Gasket Set", detailedDescription: "Complete gasket set for pump model P-300", serial: "GS-P300-01", quantity: 6, uom: "SET" },
        { itemCode: "ITEM010", description: "Safety Gloves", detailedDescription: "Cut-resistant work gloves size L", serial: "-", quantity: 50, uom: "PAIR" },
    ];

    // Mock data for supplies
    const mockSuppliesData = [
        { id: 1, description: "A4 Bond Paper", detailedDescription: "A4 White - SUP-300012", itemCode: "SUP-300012", quantity: 100, uom: "REAM" },
        { id: 2, description: "A4 Bond Paper", detailedDescription: "A4 Yellow - SUP-300013", itemCode: "SUP-300013", quantity: 75, uom: "REAM" },
        { id: 3, description: "A4 Bond Paper", detailedDescription: "A4 Blue - SUP-300014", itemCode: "SUP-300014", quantity: 50, uom: "REAM" },
        { id: 4, description: "Ballpen", detailedDescription: "Ballpen Black - SUP-400021", itemCode: "SUP-400021", quantity: 200, uom: "PCS" },
        { id: 5, description: "Ballpen", detailedDescription: "Ballpen Blue - SUP-400022", itemCode: "SUP-400022", quantity: 180, uom: "PCS" },
        { id: 6, description: "Ballpen", detailedDescription: "Ballpen Red - SUP-400023", itemCode: "SUP-400023", quantity: 150, uom: "PCS" },
        { id: 7, description: "Marker", detailedDescription: "Permanent Marker Black - SUP-500031", itemCode: "SUP-500031", quantity: 60, uom: "PCS" },
        { id: 8, description: "Marker", detailedDescription: "Permanent Marker Blue - SUP-500032", itemCode: "SUP-500032", quantity: 45, uom: "PCS" },
        { id: 9, description: "Folder", detailedDescription: "Expanding Folder - SUP-600041", itemCode: "SUP-600041", quantity: 30, uom: "PCS" },
        { id: 10, description: "Stapler", detailedDescription: "Heavy Duty Stapler - SUP-700051", itemCode: "SUP-700051", quantity: 25, uom: "PCS" },
        { id: 11, description: "Stapler Wire", detailedDescription: "Stapler Wire 23/13 - SUP-800061", itemCode: "SUP-800061", quantity: 120, uom: "BOX" },
        { id: 12, description: "Stapler Wire", detailedDescription: "Stapler Wire 23/17 - SUP-800062", itemCode: "SUP-800062", quantity: 95, uom: "BOX" },
        { id: 13, description: "Envelope", detailedDescription: "Long Brown Envelope - SUP-900071", itemCode: "SUP-900071", quantity: 500, uom: "PCS" },
        { id: 14, description: "Envelope", detailedDescription: "Long White Envelope - SUP-900072", itemCode: "SUP-900072", quantity: 450, uom: "PCS" },
        { id: 15, description: "Tape", detailedDescription: "Packaging Tape 2\" - SUP-100081", itemCode: "SUP-100081", quantity: 80, uom: "ROLL" },
    ];

    // Mock data for consigned items
    const mockConsignedData = [
        { id: 1, description: "Refrigerant R290", supplier: "CPAK - 820120R290", supplierCode: "820120R290", supplierName: "CPAK", quantity: 50, uom: "KG" },
        { id: 2, description: "Refrigerant R290", supplier: "DAIKIN - 820120R290-D", supplierCode: "820120R290-D", supplierName: "DAIKIN", quantity: 45, uom: "KG" },
        { id: 3, description: "Refrigerant R290", supplier: "SAMSUNG - 820120R290-S", supplierCode: "820120R290-S", supplierName: "SAMSUNG", quantity: 40, uom: "KG" },
        { id: 4, description: "Compressor Oil", supplier: "MOBIL - OIL-500ML", supplierCode: "OIL-500ML", supplierName: "MOBIL", quantity: 100, uom: "BTL" },
        { id: 5, description: "Compressor Oil", supplier: "SHELL - OIL-500ML-S", supplierCode: "OIL-500ML-S", supplierName: "SHELL", quantity: 85, uom: "BTL" },
        { id: 6, description: "Thermal Paste", supplier: "ARCTIC - TP-2024-A", supplierCode: "TP-2024-A", supplierName: "ARCTIC", quantity: 200, uom: "TUBE" },
        { id: 7, description: "Thermal Paste", supplier: "NOCTUA - TP-2024-N", supplierCode: "TP-2024-N", supplierName: "NOCTUA", quantity: 180, uom: "TUBE" },
        { id: 8, description: "Copper Tube", supplier: "MUELER - CT-1/4-M", supplierCode: "CT-1/4-M", supplierName: "MUELER", quantity: 300, uom: "MTR" },
        { id: 9, description: "Copper Tube", supplier: "NIBCO - CT-1/4-N", supplierCode: "CT-1/4-N", supplierName: "NIBCO", quantity: 250, uom: "MTR" },
        { id: 10, description: "Insulation Foam", supplier: "ARMAFLEX - IF-3/8-A", supplierCode: "IF-3/8-A", supplierName: "ARMAFLEX", quantity: 150, uom: "MTR" },
        { id: 11, description: "Capacitor 35uF", supplier: "PANASONIC - CAP-35UF-P", supplierCode: "CAP-35UF-P", supplierName: "PANASONIC", quantity: 75, uom: "PCS" },
        { id: 12, description: "Fan Motor", supplier: "NIDEC - FM-120W-N", supplierCode: "FM-120W-N", supplierName: "NIDEC", quantity: 30, uom: "PCS" },
        { id: 13, description: "Fan Motor", supplier: "EBM-PAPST - FM-120W-E", supplierCode: "FM-120W-E", supplierName: "EBM-PAPST", quantity: 25, uom: "PCS" },
        { id: 14, description: "Thermostat", supplier: "HONEYWELL - TST-24V-H", supplierCode: "TST-24V-H", supplierName: "HONEYWELL", quantity: 40, uom: "PCS" },
        { id: 15, description: "Thermostat", supplier: "JOHNSON - TST-24V-J", supplierCode: "TST-24V-J", supplierName: "JOHNSON", quantity: 35, uom: "PCS" },
    ];

    // Group supplies by description
    const groupedSupplies = mockSuppliesData.reduce((acc, item) => {
        if (!acc[item.description]) {
            acc[item.description] = [];
        }
        acc[item.description].push(item);
        return acc;
    }, {});

    // Get unique supplies (one per description)
    const uniqueSupplies = Object.keys(groupedSupplies).map(desc => {
        const items = groupedSupplies[desc];
        return {
            description: desc,
            variants: items,
            defaultVariant: items[0]
        };
    });

    // Handle supply detail selection
    const handleSupplyDetailChange = (description, detailedDescription) => {
        setSelectedSupplyDetails(prev => ({
            ...prev,
            [description]: detailedDescription
        }));
    };

    // Get selected variant for a supply
    const getSelectedVariant = (supply) => {
        const selectedDetail = selectedSupplyDetails[supply.description];
        if (selectedDetail) {
            return supply.variants.find(v => v.detailedDescription === selectedDetail);
        }
        return supply.defaultVariant;
    };

    // Group consigned items by description
    const groupedConsigned = mockConsignedData.reduce((acc, item) => {
        if (!acc[item.description]) {
            acc[item.description] = [];
        }
        acc[item.description].push(item);
        return acc;
    }, {});

    // Get unique consigned items (one per description)
    const uniqueConsigned = Object.keys(groupedConsigned).map(desc => {
        const items = groupedConsigned[desc];
        return {
            description: desc,
            variants: items,
            defaultVariant: items[0]
        };
    });

    // Handle consigned supplier selection
    const handleConsignedSupplierChange = (description, supplier) => {
        setSelectedConsignedSuppliers(prev => ({
            ...prev,
            [description]: supplier
        }));
    };

    // Get selected consigned variant
    const getSelectedConsignedVariant = (consigned) => {
        const selectedSupplier = selectedConsignedSuppliers[consigned.description];
        if (selectedSupplier) {
            return consigned.variants.find(v => v.supplier === selectedSupplier);
        }
        return consigned.defaultVariant;
    };

    // Filter consumable data based on search
    const filteredConsumableData = mockConsumableData.filter(item => {
        const searchLower = consumableSearch.toLowerCase();
        return (
            item.itemCode.toLowerCase().includes(searchLower) ||
            item.description.toLowerCase().includes(searchLower) ||
            item.detailedDescription.toLowerCase().includes(searchLower) ||
            item.serial.toLowerCase().includes(searchLower)
        );
    });

    // Filter supplies data based on search
    const filteredSupplies = uniqueSupplies.filter(supply => {
        const searchLower = suppliesSearch.toLowerCase();
        return (
            supply.description.toLowerCase().includes(searchLower) ||
            supply.variants.some(v => v.detailedDescription.toLowerCase().includes(searchLower))
        );
    });

    // Filter consigned data based on search
    const filteredConsigned = uniqueConsigned.filter(consigned => {
        const searchLower = consignedSearch.toLowerCase();
        return (
            consigned.description.toLowerCase().includes(searchLower) ||
            consigned.variants.some(v => v.supplier.toLowerCase().includes(searchLower))
        );
    });

    return (
        <AuthenticatedLayout>
            <Head title="OrderMaterial" />

            <div className="space-y-6">
                {/* Employee Information Card */}
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <h1 className="text-xl font-semibold border-b-2 border-primary pb-2 mb-6">
                            Material Requisition Slip
                        </h1>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {/* Employee Section */}
                            <div>
                                <h3 className="text-info font-semibold mb-3">Employee</h3>
                                <div className="flex items-start gap-3">
                                    <div className="avatar placeholder">
                                        <div className="bg-primary text-primary-content rounded-full w-12">
                                            <span className="text-xl">
                                                {emp_data?.emp_name ? emp_data.emp_name.charAt(0).toUpperCase() : 'U'}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-semibold">
                                            {emp_data?.emp_id} - {emp_data?.emp_name}
                                        </div>
                                        <div className="text-sm opacity-60">
                                            {new Date().toLocaleString('en-US', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                second: '2-digit',
                                                hour12: false
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Department Section */}
                            <div>
                                <h3 className="text-info font-semibold mb-3">Department</h3>
                                <div className="input input-bordered w-full flex items-center bg-base-200">
                                    {emp_data?.emp_dept || 'N/A'}
                                </div>
                            </div>

                            {/* Prodline / Employee ID Section */}
                            {activeTab === "consigned" ? (
                                <div>
                                    <h3 className="text-info font-semibold mb-3">Employee ID</h3>
                                    <input 
                                        type="text" 
                                        className="input input-bordered w-full"
                                        placeholder="Enter Employee ID"
                                        value={employeeId}
                                        onChange={(e) => setEmployeeId(e.target.value)}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <h3 className="text-info font-semibold mb-3">Prodline</h3>
                                    <div className="input input-bordered w-full flex items-center bg-base-200">
                                        {emp_data?.emp_prodline || 'N/A'}
                                    </div>
                                </div>
                            )}

                            {/* Approver / Factory Section */}
                            {activeTab === "consigned" ? (
                                <div>
                                    <h3 className="text-info font-semibold mb-3">Factory</h3>
                                    <select 
                                        className="select select-bordered w-full"
                                        value={selectedFactory}
                                        onChange={(e) => setSelectedFactory(e.target.value)}
                                    >
                                        <option value="" disabled>Select a Factory</option>
                                        <option value="factory1">Factory 1</option>
                                        <option value="factory2">Factory 2</option>
                                        <option value="factory3">Factory 3</option>
                                        <option value="factory4">Factory 4</option>
                                        <option value="factory5">Factory 5</option>
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <h3 className="text-info font-semibold mb-3">Approver</h3>
                                    <select 
                                        className="select select-bordered w-full"
                                        value={selectedApprover}
                                        onChange={(e) => setSelectedApprover(e.target.value)}
                                    >
                                        <option value="" disabled>Select an Approver</option>
                                        <option value="approver1">John Doe</option>
                                        <option value="approver2">Jane Smith</option>
                                        <option value="approver3">Mike Johnson</option>
                                        <option value="approver4">Sarah Williams</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabbed Card */}
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        {/* Tabs */}
                        <div className="tabs tabs-boxed mb-4">
                            <a 
                                className={`tab ${activeTab === "consumable" ? "tab-active" : ""}`}
                                onClick={() => {
                                    setActiveTab("consumable");
                                }}
                            >
                                Consumable and Spare parts
                            </a>
                            <a 
                                className={`tab ${activeTab === "supplies" ? "tab-active" : ""}`}
                                onClick={() => {
                                    setActiveTab("supplies");
                                }}
                            >
                                Supplies
                            </a>
                            <a 
                                className={`tab ${activeTab === "consigned" ? "tab-active" : ""}`}
                                onClick={() => {
                                    setActiveTab("consigned");
                                }}
                            >
                                Consigned
                            </a>
                        </div>

                        {/* Tab Content */}
                        <div className="mt-4">
{activeTab === "consumable" && (
    <div>
        <h3 className="text-lg font-semibold mb-3">Consumable and Spare parts</h3>
        
        {/* Search Bar */}
        <div className="mb-4">
            <input 
                type="text" 
                placeholder="Search by Item Code, Description, Detailed Description, or Serial..." 
                className="input input-bordered w-full"
                value={consumableSearch}
                onChange={(e) => setConsumableSearch(e.target.value)}
            />
        </div>

        <div className="overflow-x-auto">
            <table className="table table-zebra">
                <thead>
                    <tr>
                        <th>Item Code</th>
                        <th>Description</th>
                        <th>Detailed Description</th>
                        <th>Serial</th>
                        <th>Quantity</th>
                        <th>UOM</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredConsumableData.map((item, index) => (
                        <tr key={index}>
                            <td>{item.itemCode}</td>
                            <td>{item.description}</td>
                            <td>{item.detailedDescription}</td>
                            <td>{item.serial}</td>
                            <td>{item.quantity}</td>
                            <td>{item.uom}</td>
                            <td>
                                <button className="btn btn-sm btn-primary">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
)}

{activeTab === "supplies" && (
    <div>
        <h3 className="text-lg font-semibold mb-3">Supplies</h3>
        
        {/* Search Bar */}
        <div className="mb-4">
            <input 
                type="text" 
                placeholder="Search by Description or Detailed Description..." 
                className="input input-bordered w-full"
                value={suppliesSearch}
                onChange={(e) => setSuppliesSearch(e.target.value)}
            />
        </div>

        <div className="overflow-x-auto">
            <table className="table table-zebra">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th className="min-w-[350px]">Detailed Description</th>
                        <th>Quantity</th>
                        <th>UOM</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredSupplies.map((supply, index) => {
                        const selectedVariant = getSelectedVariant(supply);
                        return (
                            <tr key={index}>
                                <td>{supply.description}</td>
                                <td className="min-w-[350px]">
                                    {supply.variants.length > 1 ? (
                                        <select 
                                            className="select select-bordered w-full h-auto py-2"
                                            value={selectedVariant.detailedDescription}
                                            onChange={(e) => handleSupplyDetailChange(supply.description, e.target.value)}
                                        >
                                            {supply.variants.map((variant, vIndex) => (
                                                <option key={vIndex} value={variant.detailedDescription}>
                                                    {variant.detailedDescription}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <span>{selectedVariant.detailedDescription}</span>
                                    )}
                                </td>
                                <td>{selectedVariant.quantity}</td>
                                <td>{selectedVariant.uom}</td>
                                <td>
                                    <button className="btn btn-sm btn-primary">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>
)}

{activeTab === "consigned" && (
    <div>
        <h3 className="text-lg font-semibold mb-3">Consigned</h3>
        
        {/* Search Bar */}
        <div className="mb-4">
            <input 
                type="text" 
                placeholder="Search by Description or Supplier..." 
                className="input input-bordered w-full"
                value={consignedSearch}
                onChange={(e) => setConsignedSearch(e.target.value)}
            />
        </div>

        <div className="overflow-x-auto">
            <table className="table table-zebra">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th className="min-w-[350px]">Supplier</th>
                        <th>Quantity</th>
                        <th>UOM</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredConsigned.map((consigned, index) => {
                        const selectedVariant = getSelectedConsignedVariant(consigned);
                        return (
                            <tr key={index}>
                                <td>{consigned.description}</td>
                                <td className="min-w-[350px]">
                                    {consigned.variants.length > 1 ? (
                                        <select 
                                            className="select select-bordered w-full h-auto py-2"
                                            value={selectedVariant.supplier}
                                            onChange={(e) => handleConsignedSupplierChange(consigned.description, e.target.value)}
                                        >
                                            {consigned.variants.map((variant, vIndex) => (
                                                <option key={vIndex} value={variant.supplier}>
                                                    {variant.supplier}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <span>{selectedVariant.supplier}</span>
                                    )}
                                </td>
                                <td>{selectedVariant.quantity}</td>
                                <td>{selectedVariant.uom}</td>
                                <td>
                                    <button className="btn btn-sm btn-primary">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>
)}
</div>
</div>
</div>
</div>
        </AuthenticatedLayout>
    );
}