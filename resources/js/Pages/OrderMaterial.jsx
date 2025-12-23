import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage, router } from "@inertiajs/react";
import { FileArchive } from "lucide-react";
import { useState, useEffect, useMemo  } from "react";

export default function OrderMaterial({ consumables, supplies, consigned,approverList }) {
    const props = usePage().props;
    console.log(usePage().props);
    
    const emp_data = props.emp_data;
    const [selectedApprover, setSelectedApprover] = useState("");
    const [activeTab, setActiveTab] = useState("consumable");
    const [selectedConsumableDetails, setSelectedConsumableDetails] = useState({});
    const [selectedSupplyDetails, setSelectedSupplyDetails] = useState({});
    const [selectedConsignedSuppliers, setSelectedConsignedSuppliers] = useState({});
    const [consumableSearch, setConsumableSearch] = useState("");
    const [suppliesSearch, setSuppliesSearch] = useState("");
    const [consignedSearch, setConsignedSearch] = useState("");
    const [employeeId, setEmployeeId] = useState("");
    const [selectedFactory, setSelectedFactory] = useState("");
    const [cartItems, setCartItems] = useState([]);
    const [isCartModalOpen, setIsCartModalOpen] = useState(false);
    const isConsignedUser = emp_data?.emp_jobtitle === 'Consigned User';
    const [approverSearch, setApproverSearch] = useState("");
    
    useEffect(() => {
    if (isConsignedUser) {
        setActiveTab("consigned");
    }
}, [isConsignedUser]);

const handleSubmitOrder = () => {
    // Determine which type of items to submit based on active tab
    const itemsToSubmit = cartItems.filter(item => item.type === activeTab);
    
    if (itemsToSubmit.length === 0) {
        alert(`No ${activeTab} items to submit`);
        return;
    }

    // For consigned tab, we don't validate the global state since values are stored per item
    if (activeTab === 'consumable' || activeTab === 'supplies') {
        if (!selectedApprover) {
            alert('Please select an approver');
            return;
        }
    }

    // Prepare data for submission based on tab type
    let data = {};
    let routeName = '';

    if (activeTab === 'consumable') {
        routeName = 'order-material.submit-consumable';
        data = {
            approver: selectedApprover,
            items: itemsToSubmit.map(item => ({
                id: item.id,
                itemCode: item.itemCode,
                description: item.description,
                detailedDescription: item.detailedDescription,
                serial: item.serial,
                quantity: item.quantity,
                uom: item.uom,
                requestQuantity: item.requestQuantity,
                remarks: item.remarks || null
            }))
        };

        router.post(routeName, data, {
            onSuccess: () => {
                setCartItems(prev => prev.filter(item => item.type !== activeTab));
                setIsCartModalOpen(false);
                alert('Order submitted successfully!');
            },
            onError: (errors) => {
                console.error('Submission errors:', errors);
                alert('Failed to submit order. Please try again.');
            }
        });

    } else if (activeTab === 'supplies') {
        routeName = 'order-material.submit-supplies';
        data = {
            approver: selectedApprover,
            items: itemsToSubmit.map(item => ({
                id: item.id,
                itemCode: item.itemCode,
                description: item.description,
                detailedDescription: item.detailedDescription,
                quantity: item.quantity,
                uom: item.uom,
                requestQuantity: item.requestQuantity,
                remarks: item.remarks || null
            }))
        };

        router.post(routeName, data, {
            onSuccess: () => {
                setCartItems(prev => prev.filter(item => item.type !== activeTab));
                setIsCartModalOpen(false);
                alert('Order submitted successfully!');
            },
            onError: (errors) => {
                console.error('Submission errors:', errors);
                alert('Failed to submit order. Please try again.');
            }
        });

    } else if (activeTab === 'consigned') {
        routeName = 'order-material.submit-consigned';
        
        // Group items by employeeId and factory combination
        const groupedItems = itemsToSubmit.reduce((groups, item) => {
            const key = `${item.employeeId}|${item.factory}`;
            if (!groups[key]) {
                groups[key] = {
                    employeeId: item.employeeId,
                    factory: item.factory,
                    items: []
                };
            }
            groups[key].items.push({
                id: item.id,
                itemCode: item.itemCode,
                description: item.description,
                supplier: item.supplier,
                quantity: item.quantity,
                uom: item.uom,
                requestQuantity: item.requestQuantity,
                remarks: item.remarks || null
            });
            return groups;
        }, {});

        // Convert to array of groups
        const groupsArray = Object.values(groupedItems);
        
        // Submit ALL groups in a SINGLE request
        data = {
            groups: groupsArray
        };

        router.post(routeName, data, {
            onSuccess: () => {
                // Clear all consigned items from cart
                setCartItems(prev => prev.filter(item => item.type !== activeTab));
                setIsCartModalOpen(false);
                alert('All orders submitted successfully with the same MRS number!');
            },
            onError: (errors) => {
                console.error('Submission errors:', errors);
                alert('Failed to submit order. Please try again.');
            }
        });
    }
};

    // Flatten consumable data with details
    const consumableData = consumables?.flatMap(consumable => 
        consumable.details?.map(detail => ({
            id: detail.id,
            consumable_id: consumable.consumable_id,
            itemCode: detail.item_code,
            description: consumable.material_description,
            detailedDescription: detail.detailed_description,
            serial: detail.serial || "-",
            quantity: detail.quantity,
            uom: consumable.uom,
            category: consumable.category,
            binLocation: detail.bin_location
        })) || []
    ) || [];

    // Group consumables by description
    const groupedConsumables = consumableData.reduce((acc, item) => {
        if (!acc[item.description]) {
            acc[item.description] = [];
        }
        acc[item.description].push(item);
        return acc;
    }, {});

    // Get unique consumables (one per description)
    const uniqueConsumables = Object.keys(groupedConsumables).map(desc => {
        const items = groupedConsumables[desc];
        return {
            description: desc,
            uom: items[0].uom,
            variants: items,
            defaultVariant: items[0]
        };
    });

    // Handle consumable detail selection
    const handleConsumableDetailChange = (description, selectedKey) => {
        setSelectedConsumableDetails(prev => ({
            ...prev,
            [description]: selectedKey
        }));
    };

    // Get selected variant for a consumable
    const getSelectedConsumableVariant = (consumable) => {
        const selectedKey = selectedConsumableDetails[consumable.description];
        if (selectedKey) {
            return consumable.variants.find(v => 
                `${v.itemCode}|${v.detailedDescription}|${v.serial}` === selectedKey
            );
        }
        return consumable.defaultVariant;
    };

    // Flatten supplies data with details
    const suppliesData = supplies?.flatMap(supply => 
        supply.details?.map(detail => ({
            id: detail.id,
            supplies_no: supply.supplies_no,
            description: supply.material_description,
            detailedDescription: detail.detailed_description,
            itemCode: detail.item_code,
            quantity: detail.qty,
            uom: supply.uom,
            price: detail.price,
            min: detail.min,
            max: detail.max
        })) || []
    ) || [];

    // Flatten consigned data with details
    const consignedData = consigned?.flatMap(item => 
        item.details?.map(detail => ({
            id: detail.id,
            consigned_no: item.consigned_no,
            description: item.mat_description,
            supplier: detail.supplier,
            itemCode: detail.item_code,
            quantity: detail.qty,
            uom: detail.uom,
            category: item.category,
            price: detail.price,
            binLocation: detail.bin_location,
            expiration: detail.expiration,
            qtyPerBox: detail.qty_per_box,
            minimum: detail.minimum,
            maximum: detail.maximum
        })) || []
    ) || [];

    // Group supplies by description
    const groupedSupplies = suppliesData.reduce((acc, item) => {
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
    const groupedConsigned = consignedData.reduce((acc, item) => {
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
    const filteredConsumables = uniqueConsumables.filter(consumable => {
        const searchLower = consumableSearch.toLowerCase();
        return (
            consumable.description.toLowerCase().includes(searchLower) ||
            consumable.variants.some(v => 
                v.itemCode.toLowerCase().includes(searchLower) ||
                v.detailedDescription.toLowerCase().includes(searchLower) ||
                v.serial.toLowerCase().includes(searchLower)
            )
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

// Add item to cart with validation
const addToCart = (item, type) => {
    // Validation for consumable and supplies
    if ((type === 'consumable' || type === 'supplies') && !selectedApprover) {
        alert('Please select an Approver before adding items to cart.');
        return;
    }
    
    // Validation for consigned
    if (type === 'consigned') {
        if (!employeeId.trim()) {
            alert('Please enter an Employee ID before adding items to cart.');
            return;
        }
        if (!selectedFactory) {
            alert('Please select a Factory before adding items to cart.');
            return;
        }
    }
    
    // Special handling for consigned items with FIFO and matching details
    if (type === 'consigned' && item.allMatchingDetails) {
        // Sort details by expiration (FIFO)
        const sortedDetails = [...item.allMatchingDetails].sort((a, b) => {
            if (!a.expiration && !b.expiration) return 0;
            if (!a.expiration) return 1;
            if (!b.expiration) return -1;
            return new Date(a.expiration) - new Date(b.expiration);
        });
        
        // Find the item with the oldest expiration that has available quantity
        const availableDetail = sortedDetails.find(detail => 
            parseFloat(detail.qty || 0) > 0
        );
        
        if (!availableDetail) {
            alert('No available quantity for this item');
            return;
        }
        
        const cartItem = {
            id: availableDetail.id,
            consignedId: item.consignedId,
            itemCode: item.itemCode,
            description: item.description,
            supplier: item.supplier,
            quantity: parseFloat(availableDetail.qty || 0),
            uom: availableDetail.uom,
            expiration: availableDetail.expiration,
            binLocation: availableDetail.bin_location,
            type: type,
            requestQuantity: 1, // Default request quantity
            cartId: `${type}-${availableDetail.id}-${Date.now()}`, // Unique ID for cart item
            // Store consigned-specific data with the item
            employeeId: employeeId,
            factory: selectedFactory,
            // Store all matching details for reference
            allMatchingDetails: item.allMatchingDetails
        };
        
        setCartItems(prev => [...prev, cartItem]);
        return;
    }
    
    // Regular handling for other types
    const cartItem = {
        ...item,
        type: type,
        requestQuantity: 1, // Default request quantity
        cartId: `${type}-${item.id}-${Date.now()}`, // Unique ID for cart item
        // Store consigned-specific data with the item
        ...(type === 'consigned' && {
            employeeId: employeeId,
            factory: selectedFactory
        })
    };
    
    setCartItems(prev => [...prev, cartItem]);
};

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
{activeTab === "consigned" && isConsignedUser ? (
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
) : !isConsignedUser ? (
    <div>
        <h3 className="text-info font-semibold mb-3">Prodline</h3>
        <div className="input input-bordered w-full flex items-center bg-base-200">
            {emp_data?.emp_prodline || 'N/A'}
        </div>
    </div>
) : null}

{/* Factory Section for Consigned Users */}
{activeTab === "consigned" && isConsignedUser ? (
    <div>
        <h3 className="text-info font-semibold mb-3">Factory</h3>
        <select 
            className="select select-bordered w-full"
            value={selectedFactory}
            onChange={(e) => setSelectedFactory(e.target.value)}
        >
            <option value="" disabled>Select a Factory</option>
            <option value="Factory 1">Factory 1</option>
            <option value="Factory 2">Factory 2</option>
            <option value="Factory 3">Factory 3</option>
            <option value="Factory 4">Factory 4</option>
            <option value="Factory 5">Factory 5</option>
        </select>
    </div>
) : !isConsignedUser ? (
<div>
  <h3 className="text-info font-semibold mb-3">Approver</h3>

  <div className="dropdown w-full">
    <label
      tabIndex={0}
      className="input input-bordered w-full flex items-center justify-between cursor-pointer"
    >
      {selectedApprover
        ? approverList.find(a => a.EMPLOYID === selectedApprover)?.EMPNAME
          ? `${selectedApprover} - ${
              approverList.find(a => a.EMPLOYID === selectedApprover)?.EMPNAME
            }`
          : selectedApprover
        : "Select an Approver"}
    </label>

    <div
      tabIndex={0}
      className="dropdown-content z-[1] mt-2 w-full rounded-box bg-base-100 shadow"
    >
      {/* Search input */}
      <input
        type="text"
        className="input input-bordered w-full mb-2"
        placeholder="Search approver..."
        value={approverSearch}
        onChange={(e) => setApproverSearch(e.target.value)}
      />

      {/* Result list */}
      <ul className="menu max-h-60 overflow-y-auto">
        {approverList
          ?.filter(a =>
            `${a.EMPLOYID} ${a.EMPNAME}`
              .toLowerCase()
              .includes(approverSearch.toLowerCase())
          )
          .map(approver => (
            <li key={approver.EMPLOYID}>
              <button
                type="button"
                onClick={() => {
                  setSelectedApprover(approver.EMPNAME);
                  setApproverSearch("");
                  document.activeElement.blur(); // closes dropdown
                }}
              >
                {approver.EMPLOYID} - {approver.EMPNAME}
              </button>
            </li>
          ))}
      </ul>
    </div>
  </div>
</div>

) : null}
                        </div>
                    </div>
                </div>

                {/* Tabbed Card */}
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        {/* Tabs with Cart Button */}
<div className="flex justify-between items-center mb-4">
    <div className="tabs tabs-boxed">
        {/* Only show Consumable and Supplies tabs if NOT a Consigned User */}
        {!isConsignedUser && (
            <>
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
            </>
        )}
        {/* Only show Consigned tab if user has Consigned User job title */}
        {isConsignedUser && (
            <a 
                className={`tab ${activeTab === "consigned" ? "tab-active" : ""}`}
                onClick={() => {
                    setActiveTab("consigned");
                }}
            >
                Consigned
            </a>
        )}
    </div>
</div>

                        {/* Tab Content */}
                        <div className="mt-4">
{activeTab === "consumable" && (
    <div>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold mb-3">Consumable and Spare parts</h3>
            <button 
                className="btn btn-primary gap-2"
                onClick={() => setIsCartModalOpen(true)}
            >
                <div className="indicator">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {cartItems.length > 0 && (
                        <span className="indicator-item badge badge-secondary">{cartItems.length}</span>
                    )}
                </div>
                Cart Items
            </button>
        </div>
            
            {/* Search Bar */}
            <div className="mb-4">
                <input 
                    type="text" 
                    placeholder="Search by Description, Item Code, Detailed Description, or Serial..." 
                    className="input input-bordered w-full"
                    value={consumableSearch}
                    onChange={(e) => setConsumableSearch(e.target.value)}
                />
            </div>

            <div className="overflow-x-auto">
                <table className="table table-zebra">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th className="min-w-[200px]">Item Code</th>
                            <th className="min-w-[250px]">Detailed Description</th>
                            <th className="min-w-[150px]">Serial</th>
                            <th>Quantity</th>
                            <th>UOM</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredConsumables.length > 0 ? (
                            filteredConsumables.map((consumable, index) => {
                                const selectedVariant = getSelectedConsumableVariant(consumable);
                                return (
                                    <tr key={index}>
                                        <td>{consumable.description}</td>
                                        <td className="min-w-[200px]">
                                            {consumable.variants.length > 1 ? (
                                                <select 
                                                    className="select select-bordered w-full h-auto py-2"
                                                    value={`${selectedVariant.itemCode}|${selectedVariant.detailedDescription}|${selectedVariant.serial}`}
                                                    onChange={(e) => handleConsumableDetailChange(consumable.description, e.target.value)}
                                                >
                                                    {consumable.variants.map((variant, vIndex) => (
                                                        <option 
                                                            key={vIndex} 
                                                            value={`${variant.itemCode}|${variant.detailedDescription}|${variant.serial}`}
                                                        >
                                                            {variant.itemCode}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span>{selectedVariant.itemCode}</span>
                                            )}
                                        </td>
                                        <td className="min-w-[250px]">
                                            {consumable.variants.length > 1 ? (
                                                <select 
                                                    className="select select-bordered w-full h-auto py-2"
                                                    value={`${selectedVariant.itemCode}|${selectedVariant.detailedDescription}|${selectedVariant.serial}`}
                                                    onChange={(e) => handleConsumableDetailChange(consumable.description, e.target.value)}
                                                >
                                                    {consumable.variants.map((variant, vIndex) => (
                                                        <option 
                                                            key={vIndex} 
                                                            value={`${variant.itemCode}|${variant.detailedDescription}|${variant.serial}`}
                                                        >
                                                            {variant.detailedDescription}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span>{selectedVariant.detailedDescription}</span>
                                            )}
                                        </td>
                                        <td className="min-w-[150px]">
                                            {consumable.variants.length > 1 ? (
                                                <select 
                                                    className="select select-bordered w-full h-auto py-2"
                                                    value={`${selectedVariant.itemCode}|${selectedVariant.detailedDescription}|${selectedVariant.serial}`}
                                                    onChange={(e) => handleConsumableDetailChange(consumable.description, e.target.value)}
                                                >
                                                    {consumable.variants.map((variant, vIndex) => (
                                                        <option 
                                                            key={vIndex} 
                                                            value={`${variant.itemCode}|${variant.detailedDescription}|${variant.serial}`}
                                                        >
                                                            {variant.serial}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span>{selectedVariant.serial}</span>
                                            )}
                                        </td>
                                        <td>{selectedVariant.quantity}</td>
                                        <td>{selectedVariant.uom}</td>
                                        <td>
                                            <button 
                                                className="btn btn-sm btn-primary"
                                                disabled={!selectedApprover}
                                                onClick={() => {
                                                    const selectedVariant = getSelectedConsumableVariant(consumable);
                                                    addToCart({
                                                        id: selectedVariant.id,
                                                        itemCode: selectedVariant.itemCode,
                                                        description: consumable.description,
                                                        detailedDescription: selectedVariant.detailedDescription,
                                                        serial: selectedVariant.serial,
                                                        quantity: selectedVariant.quantity,
                                                        uom: selectedVariant.uom
                                                    }, 'consumable');
                                                }}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="7" className="text-center py-4">No consumable items found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )}

    {activeTab === "supplies" && (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold mb-3">Supplies</h3>
                <button 
                    className="btn btn-primary gap-2"
                    onClick={() => setIsCartModalOpen(true)}
                >
                    <div className="indicator">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {cartItems.length > 0 && (
                            <span className="indicator-item badge badge-secondary">{cartItems.length}</span>
                        )}
                    </div>
                    Cart Items
                </button>
            </div>
            
            {/* Search Bar */}
            <div className="mb-4">
                <input 
                    type="text" 
                    placeholder="Search by Description, Detailed Description, or Item Code..." 
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
                        {filteredSupplies.length > 0 ? (
                            filteredSupplies.map((supply, index) => {
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
                                                            {variant.detailedDescription} - {variant.itemCode}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span>{selectedVariant.detailedDescription} - {selectedVariant.itemCode}</span>
                                            )}
                                        </td>
                                        <td>{selectedVariant.quantity}</td>
                                        <td>{selectedVariant.uom}</td>
                                        <td>
                                            <button 
                                                className="btn btn-sm btn-primary"
                                                disabled={!selectedApprover}
                                                onClick={() => {
                                                    const selectedVariant = getSelectedVariant(supply);
                                                    addToCart({
                                                        id: selectedVariant.id,
                                                        itemCode: selectedVariant.itemCode,
                                                        description: supply.description,
                                                        detailedDescription: selectedVariant.detailedDescription,
                                                        quantity: selectedVariant.quantity,
                                                        uom: selectedVariant.uom
                                                    }, 'supplies');
                                                }}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="5" className="text-center py-4">No supplies found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )}

{activeTab === "consigned" && isConsignedUser && (
    <div>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold mb-3">Consigned</h3>
            <button 
                className="btn btn-primary gap-2"
                onClick={() => setIsCartModalOpen(true)}
            >
                <div className="indicator">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {cartItems.length > 0 && (
                        <span className="indicator-item badge badge-secondary">{cartItems.length}</span>
                    )}
                </div>
                Cart Items
            </button>
        </div>
        
        {/* Search Bar */}
        <div className="mb-4">
            <input 
                type="text" 
                placeholder="Search by Description, Item Code, or Supplier..." 
                className="input input-bordered w-full"
                value={consignedSearch}
                onChange={(e) => setConsignedSearch(e.target.value)}
            />
        </div>

        <div className="overflow-x-auto">
            <table className="table table-zebra">
                <thead>
                    <tr>
                        <th className="min-w-[150px]">Item Code</th>
                        <th className="min-w-[250px]">Description</th>
                        <th className="min-w-[200px]">Supplier</th>
                        <th>Quantity</th>
                        <th>UOM</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {consigned.length > 0 ? (() => {
                        // Filter items that have selected_itemcode and selected_supplier
                        const itemsWithSelection = consigned.filter(item => 
                            item.selected_itemcode && item.selected_supplier
                        );

                        // Filter based on search
                        const filteredItems = itemsWithSelection.filter(item => {
                            const searchLower = consignedSearch.toLowerCase();
                            return (
                                item.mat_description.toLowerCase().includes(searchLower) ||
                                item.selected_itemcode.toLowerCase().includes(searchLower) ||
                                item.selected_supplier.toLowerCase().includes(searchLower)
                            );
                        });

                        if (filteredItems.length === 0) {
                            return (
                                <tr>
                                    <td colSpan="6" className="text-center py-4">
                                        {itemsWithSelection.length === 0 
                                            ? "No consigned items with selected item code and supplier"
                                            : "No consigned items found matching search"
                                        }
                                    </td>
                                </tr>
                            );
                        }

                        return filteredItems.map((item, index) => {
                            // Find the matching detail based on selected_itemcode and selected_supplier
                            const matchingDetails = item.details.filter(detail => 
                                detail.item_code === item.selected_itemcode && 
                                detail.supplier === item.selected_supplier
                            );

                            if (matchingDetails.length === 0) {
                                return null; // Skip this item if no matching details found
                            }

                            // Sort matching details by expiration (FIFO)
                            const sortedDetails = matchingDetails.sort((a, b) => {
                                // Handle items without expiration
                                if (!a.expiration && !b.expiration) return 0;
                                if (!a.expiration) return 1;
                                if (!b.expiration) return -1;
                                return new Date(a.expiration) - new Date(b.expiration);
                            });

                            // Get the oldest item (FIFO) and calculate total quantity
                            const oldestDetail = sortedDetails[0];
                            const totalQuantity = matchingDetails.reduce((sum, detail) => 
                                sum + parseFloat(detail.qty || 0), 0
                            );

                            return (
                                <tr key={`${item.consigned_no}-${index}`}>
                                    <td>{item.selected_itemcode}</td>
                                    <td>{item.mat_description}</td>
                                    <td>{item.selected_supplier}</td>
                                    <td>{totalQuantity}</td>
                                    <td>{oldestDetail.uom}</td>
                                    <td>
                                        <button 
                                            className="btn btn-sm btn-primary"
                                            disabled={!employeeId.trim() || !selectedFactory || totalQuantity <= 0}
                                            onClick={() => {
                                                if (totalQuantity <= 0) {
                                                    alert('No available quantity for this item');
                                                    return;
                                                }

                                                // Find the detail with the oldest expiration that has quantity
                                                const availableDetail = sortedDetails.find(detail => 
                                                    parseFloat(detail.qty || 0) > 0
                                                );

                                                if (!availableDetail) {
                                                    alert('No available quantity for this item');
                                                    return;
                                                }

                                                addToCart({
                                                    id: availableDetail.id,
                                                    consignedId: item.id || item.consigned_no,
                                                    itemCode: item.selected_itemcode,
                                                    description: item.mat_description,
                                                    supplier: item.selected_supplier,
                                                    quantity: parseFloat(availableDetail.qty || 0),
                                                    uom: availableDetail.uom,
                                                    expiration: availableDetail.expiration,
                                                    binLocation: availableDetail.bin_location,
                                                    // Store all matching details for reference
                                                    allMatchingDetails: matchingDetails,
                                                    // Include the current employeeId and factory with each item
                                                    employeeId: employeeId,
                                                    factory: selectedFactory
                                                }, 'consigned');
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            );
                        }).filter(Boolean); // Remove null items
                    })() : (
                        <tr>
                            <td colSpan="6" className="text-center py-4">No consigned items found</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
)}
    </div>
   </div>
  </div>
 </div>

{/* Cart Modal */}
{/* Cart Modal */}
{isCartModalOpen && (
    <div className="modal modal-open">
        <div className="modal-box max-w-6xl">
            <h3 className="font-bold text-lg mb-4">
                Added Item List for {
                    activeTab === "consumable" ? "Consumable and Spare parts" :
                    activeTab === "supplies" ? "Supplies" :
                    "Consigned"
                }
            </h3>
           
            <div className="overflow-x-auto">
                {cartItems.length > 0 ? (
                    <>
                        {/* Consumable Table */}
                        {activeTab === "consumable" && (
                            <table className="table table-zebra w-full">
                                <thead>
                                    <tr>
                                        <th>Item Code</th>
                                        <th>Description</th>
                                        <th>Detailed Description</th>
                                        <th>Serial</th>
                                        <th>Quantity</th>
                                        <th>UOM</th>
                                        <th>Request Quantity</th>
                                        <th className="min-w-[200px]">Remarks</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cartItems
                                        .filter(item => item.type === "consumable")
                                        .map((item) => (
                                            <tr key={item.cartId}>
                                                <td>{item.itemCode}</td>
                                                <td>{item.description}</td>
                                                <td>{item.detailedDescription}</td>
                                                <td>{item.serial}</td>
                                                <td>{item.quantity}</td>
                                                <td>{item.uom}</td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        min="1"
                                                        max={item.quantity}
                                                        className="input input-bordered input-sm w-24"
                                                        value={item.requestQuantity}
                                                        onChange={(e) => {
                                                            const newQuantity = parseInt(e.target.value) || 1;
                                                            setCartItems(prev => 
                                                                prev.map(cartItem => 
                                                                    cartItem.cartId === item.cartId 
                                                                        ? {...cartItem, requestQuantity: newQuantity}
                                                                        : cartItem
                                                                )
                                                            );
                                                        }}
                                                    />
                                                </td>
                                                <td>
                                                    <textarea
                                                        className="textarea textarea-bordered textarea-sm w-full min-w-[200px]"
                                                        placeholder="Add remarks (optional)..."
                                                        rows="2"
                                                        value={item.remarks || ''}
                                                        onChange={(e) => {
                                                            setCartItems(prev => 
                                                                prev.map(cartItem => 
                                                                    cartItem.cartId === item.cartId 
                                                                        ? {...cartItem, remarks: e.target.value}
                                                                        : cartItem
                                                                )
                                                            );
                                                        }}
                                                    />
                                                </td>
                                                <td>
                                                    <button 
                                                        className="btn btn-sm btn-error"
                                                        onClick={() => {
                                                            setCartItems(prev => 
                                                                prev.filter(cartItem => cartItem.cartId !== item.cartId)
                                                            );
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        )}

                        {/* Supplies Table */}
                        {activeTab === "supplies" && (
                            <table className="table table-zebra w-full">
                                <thead>
                                    <tr>
                                        <th>Item Code</th>
                                        <th>Description</th>
                                        <th>Detailed Description</th>
                                        <th>Quantity</th>
                                        <th>UOM</th>
                                        <th>Request Quantity</th>
                                        <th className="min-w-[200px]">Remarks</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cartItems
                                        .filter(item => item.type === "supplies")
                                        .map((item) => (
                                            <tr key={item.cartId}>
                                                <td>{item.itemCode}</td>
                                                <td>{item.description}</td>
                                                <td>{item.detailedDescription}</td>
                                                <td>{item.quantity}</td>
                                                <td>{item.uom}</td>
                                                <td>
                                                    <input 
                                                        type="number" 
                                                        min="1"
                                                        max={item.quantity}
                                                        className="input input-bordered input-sm w-24"
                                                        value={item.requestQuantity}
                                                        onChange={(e) => {
                                                            const newQuantity = parseInt(e.target.value) || 1;
                                                            setCartItems(prev => 
                                                                prev.map(cartItem => 
                                                                    cartItem.cartId === item.cartId 
                                                                        ? {...cartItem, requestQuantity: newQuantity}
                                                                        : cartItem
                                                                )
                                                            );
                                                        }}
                                                    />
                                                </td>
                                                <td>
                                                    <textarea
                                                        className="textarea textarea-bordered textarea-sm w-full min-w-[200px]"
                                                        placeholder="Add remarks (optional)..."
                                                        rows="2"
                                                        value={item.remarks || ''}
                                                        onChange={(e) => {
                                                            setCartItems(prev => 
                                                                prev.map(cartItem => 
                                                                    cartItem.cartId === item.cartId 
                                                                        ? {...cartItem, remarks: e.target.value}
                                                                        : cartItem
                                                                )
                                                            );
                                                        }}
                                                    />
                                                </td>
                                                <td>
                                                    <button 
                                                        className="btn btn-sm btn-error"
                                                        onClick={() => {
                                                            setCartItems(prev => 
                                                                prev.filter(cartItem => cartItem.cartId !== item.cartId)
                                                            );
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        )}

                        {/* Consigned Table - Grouped by Employee ID and Factory */}
                        {activeTab === "consigned" && isConsignedUser && (() => {
                            const groupedConsignedItems = cartItems
                                .filter(item => item.type === "consigned")
                                .reduce((groups, item) => {
                                    const key = `${item.employeeId}|${item.factory}`;
                                    if (!groups[key]) {
                                        groups[key] = {
                                            employeeId: item.employeeId,
                                            factory: item.factory,
                                            items: []
                                        };
                                    }
                                    groups[key].items.push(item);
                                    return groups;
                                }, {});

                            const groups = Object.values(groupedConsignedItems);

                            return (
                                <div className="space-y-6">
                                    {groups.map((group, groupIndex) => (
                                        <div key={groupIndex} className="border border-base-300 rounded-lg p-4">
                                            {/* Group Header */}
                                            <div className="bg-base-200 p-3 rounded-lg mb-4">
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div>
                                                        <span className="font-semibold text-sm">Employee ID:</span>
                                                        <span className="ml-2 text-sm">{group.employeeId}</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-sm">Factory:</span>
                                                        <span className="ml-2 text-sm">{group.factory}</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-sm">Station:</span>
                                                        <span className="ml-2 text-sm">{emp_data?.emp_station || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Group Table */}
                                            <table className="table table-zebra w-full">
                                                <thead>
                                                    <tr>
                                                        <th>Item Code</th>
                                                        <th>Description</th>
                                                        <th>Supplier</th>
                                                        <th>Quantity</th>
                                                        <th>UOM</th>
                                                        <th>Request Quantity</th>
                                                        <th className="min-w-[200px]">Remarks</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {group.items.map((item) => (
                                                        <tr key={item.cartId}>
                                                            <td>{item.itemCode}</td>
                                                            <td>{item.description}</td>
                                                            <td>{item.supplier}</td>
                                                            <td>{item.quantity}</td>
                                                            <td>{item.uom}</td>
                                                            <td>
                                                                <input 
                                                                    type="number" 
                                                                    min="1"
                                                                    max={item.quantity}
                                                                    className="input input-bordered input-sm w-24"
                                                                    value={item.requestQuantity}
                                                                    onChange={(e) => {
                                                                        const newQuantity = parseInt(e.target.value) || 1;
                                                                        setCartItems(prev => 
                                                                            prev.map(cartItem => 
                                                                                cartItem.cartId === item.cartId 
                                                                                    ? {...cartItem, requestQuantity: newQuantity}
                                                                                    : cartItem
                                                                            )
                                                                        );
                                                                    }}
                                                                />
                                                            </td>
                                                            <td>
                                                                <textarea
                                                                    className="textarea textarea-bordered textarea-sm w-full min-w-[200px]"
                                                                    placeholder="Add remarks (optional)..."
                                                                    rows="2"
                                                                    value={item.remarks || ''}
                                                                    onChange={(e) => {
                                                                        setCartItems(prev => 
                                                                            prev.map(cartItem => 
                                                                                cartItem.cartId === item.cartId 
                                                                                    ? {...cartItem, remarks: e.target.value}
                                                                                    : cartItem
                                                                            )
                                                                        );
                                                                    }}
                                                                />
                                                            </td>
                                                            <td>
                                                                <button 
                                                                    className="btn btn-sm btn-error"
                                                                    onClick={() => {
                                                                        setCartItems(prev => 
                                                                            prev.filter(cartItem => cartItem.cartId !== item.cartId)
                                                                        );
                                                                    }}
                                                                >
                                                                    Remove
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        No items in cart
                    </div>
                )}
            </div>
            
            <div className="modal-action">
                <button 
                    className="btn"
                    onClick={() => setIsCartModalOpen(false)}
                >
                    Close
                </button>
                {cartItems.filter(item => item.type === activeTab).length > 0 && (
                    <button 
                        className="btn btn-primary"
                        onClick={handleSubmitOrder}
                    >
                        Submit Order
                    </button>
                )}
            </div>
        </div>
        <div 
            className="modal-backdrop"
            onClick={() => setIsCartModalOpen(false)}
        ></div>
    </div>
)}
        </AuthenticatedLayout>
    );
}