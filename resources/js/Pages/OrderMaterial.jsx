import { useState, useEffect } from 'react';
import _ from 'lodash';
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage, router } from "@inertiajs/react";

export default function OrderMaterial({ pagination, approvers = [], currentType, currentSearch }) {
    const [activeTab, setActiveTab] = useState(currentType || 'consumable');
    const [searchTerm, setSearchTerm] = useState(currentSearch || '');
    const [isCartModalOpen, setIsCartModalOpen] = useState(false);
    const [cartItems, setCartItems] = useState([]);
    const [selectedApprover, setSelectedApprover] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const props = usePage().props;
    
    // Get employee data from session
    const empData = props.emp_data || {};
    const userName = empData.emp_name || "Unknown User";
    const empId = empData.emp_id || "N/A";
    const empDepartment = empData.emp_dept || "";
    const empProdline = empData.emp_prodline || "";
    
    // Get current date and time
    const currentDateTime = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    // Pagination data from server
    const items = pagination?.data || [];
    const currentPage = pagination?.current_page || 1;
    const totalPages = pagination?.last_page || 1;
    const total = pagination?.total || 0;
    const perPage = pagination?.per_page || 10;

    // Calculate display range
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = Math.min(startIndex + items.length, total);

    // Debounced search function using Lodash
    const debouncedSearch = _.debounce((value) => {
        router.get(route('order-material.index'), {
            type: activeTab,
            search: value,
            page: 1,
            per_page: perPage
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    }, 500);

    // Handle search with debounce
    const handleSearch = (value) => {
        setSearchTerm(value);
        debouncedSearch(value);
    };

    // Handle page change
    const handlePageChange = (page) => {
        router.get(route('order-material.index'), {
            type: activeTab,
            search: searchTerm,
            page: page,
            per_page: perPage
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Handle tab change
    const handleTabChange = (tab) => {
        const currentTabCartItems = _.filter(cartItems, { type: activeTab });
        
        if (!_.isEmpty(currentTabCartItems)) {
            const confirmSwitch = window.confirm(
                `You have ${currentTabCartItems.length} item(s) in your cart for ${activeTab === 'consumable' ? 'Consumable' : 'Supplies'}. Switching tabs will discard these items. Do you want to continue?`
            );
            
            if (!confirmSwitch) {
                return;
            }
            
            setCartItems(_.filter(cartItems, (item) => item.type !== activeTab));
        }
        
        setActiveTab(tab);
        setSearchTerm('');
        
        router.get(route('order-material.index'), {
            type: tab,
            search: '',
            page: 1,
            per_page: perPage
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Handle add to cart action
    const handleAddToCart = (item) => {
        if (item.quantity <= 0) {
            alert('This item is out of stock and cannot be added to cart.');
            return;
        }

        // For supplies, we need to track by both id and detail_id
        const cartKey = activeTab === 'supplies' 
            ? (cartItem) => cartItem.id === item.id && cartItem.detail_id === item.detail_id && cartItem.type === activeTab
            : (cartItem) => cartItem.id === item.id && cartItem.type === activeTab;
        
        const existingItemIndex = _.findIndex(cartItems, cartKey);
        
        if (existingItemIndex !== -1) {
            const updatedCart = [...cartItems];
            const newQuantity = (updatedCart[existingItemIndex].requestQuantity || 0) + 1;
            
            if (newQuantity > item.quantity) {
                alert(`Cannot add more. Maximum available quantity is ${item.quantity}`);
                return;
            }
            
            updatedCart[existingItemIndex].requestQuantity = newQuantity;
            setCartItems(updatedCart);
            alert(`Quantity updated for: ${item.description}`);
        } else {
            const cartItem = { 
                ...item, 
                requestQuantity: 1, 
                type: activeTab, 
                remarks: '' 
            };
            setCartItems([...cartItems, cartItem]);
            alert(`Added to cart: ${item.description}`);
        }
    };

    // Handle request quantity change
    const handleRequestQuantityChange = (id, detailId, type, value) => {
        const numValue = parseInt(value) || 0;
        const updatedCart = _.map(cartItems, (item) => {
            const matches = type === 'supplies'
                ? item.id === id && item.detail_id === detailId && item.type === type
                : item.id === id && item.type === type;
            
            if (matches) {
                const maxQty = item.quantity;
                return { ...item, requestQuantity: _.clamp(numValue, 0, maxQty) };
            }
            return item;
        });
        setCartItems(updatedCart);
    };

    // Handle remarks change for individual item
    const handleItemRemarksChange = (id, detailId, type, value) => {
        const updatedCart = _.map(cartItems, (item) => {
            const matches = type === 'supplies'
                ? item.id === id && item.detail_id === detailId && item.type === type
                : item.id === id && item.type === type;
            
            return matches ? { ...item, remarks: value } : item;
        });
        setCartItems(updatedCart);
    };

    // Handle remove from cart
    const handleRemoveFromCart = (id, detailId, type) => {
        const confirmRemove = window.confirm('Are you sure you want to remove this item from cart?');
        if (confirmRemove) {
            setCartItems(_.filter(cartItems, (item) => {
                if (type === 'supplies') {
                    return !(item.id === id && item.detail_id === detailId && item.type === type);
                }
                return !(item.id === id && item.type === type);
            }));
        }
    };

    // Open cart modal
    const handleOpenCart = () => {
        if (_.isEmpty(cartItems)) {
            alert('Your cart is empty. Please add items first.');
            return;
        }
        setIsCartModalOpen(true);
    };

    // Close cart modal
    const handleCloseCart = () => {
        if (isSubmitting) return;
        setIsCartModalOpen(false);
    };

    // Get cart items for current tab using Lodash
    const currentCartItems = _.filter(cartItems, { type: activeTab });

    // Get total cart count
    const totalCartItems = _.size(cartItems);

    // Handle submit request
    const handleSubmitRequest = () => {
        if (_.isEmpty(cartItems)) {
            alert('Cart is empty!');
            return;
        }

        if (!empDepartment || !empProdline) {
            alert('Department and Prodline are required!');
            return;
        }

        if (!selectedApprover) {
            alert('Please select an approver!');
            return;
        }

        const invalidItems = _.filter(cartItems, (item) => !item.requestQuantity || item.requestQuantity <= 0);
        if (!_.isEmpty(invalidItems)) {
            alert('Please ensure all items have valid request quantities!');
            return;
        }

        const exceededItems = _.filter(cartItems, (item) => item.requestQuantity > item.quantity);
        if (!_.isEmpty(exceededItems)) {
            alert('Some items have request quantities exceeding available stock!');
            return;
        }

        const confirmSubmit = window.confirm(
            `You are about to submit a request for ${_.size(cartItems)} item(s).\n\nApprover: ${selectedApprover}\n\nDo you want to proceed?`
        );

        if (!confirmSubmit) {
            return;
        }

        setIsSubmitting(true);

        router.post(route('order-material.submit'), {
            cartItems: cartItems,
            employee_no: empId,
            department: empDepartment,
            prodline: empProdline,
            approver: selectedApprover,
        }, {
            onSuccess: (page) => {
                setIsSubmitting(false);
                setCartItems([]);
                setIsCartModalOpen(false);
                setSelectedApprover('');
                
                if (page.props.flash?.success) {
                    alert(page.props.flash.success);
                } else {
                    alert('Request submitted successfully!');
                }
            },
            onError: (errors) => {
                setIsSubmitting(false);
                console.error('Submission errors:', errors);
                
                const errorMessage = errors.message || 'Failed to submit request. Please try again.';
                alert(errorMessage);
            }
        });
    };

    // Generate page numbers with ellipsis using Lodash
    const generatePageNumbers = () => {
        if (totalPages <= 7) {
            return _.range(1, totalPages + 1);
        }

        const pages = [];
        if (currentPage <= 4) {
            pages.push(..._.range(1, 6));
            pages.push('...');
            pages.push(totalPages);
        } else if (currentPage >= totalPages - 3) {
            pages.push(1);
            pages.push('...');
            pages.push(..._.range(totalPages - 4, totalPages + 1));
        } else {
            pages.push(1);
            pages.push('...');
            pages.push(..._.range(currentPage - 1, currentPage + 2));
            pages.push('...');
            pages.push(totalPages);
        }
        
        return pages;
    };

    return (
        <AuthenticatedLayout>
            <Head title="Order Material" />
            
            <div className="p-4">
                <h1 className="text-xl font-semibold mb-2">Material Requisition Slip</h1>

                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        {/* Employee Section */}
                        <div className="mb-4 flex justify-between items-center">
                            <div>
                                <label className="label">
                                    <span className="label-text text-cyan-600 font-semibold">Employee</span>
                                </label>
                                <div className="flex items-center gap-3">
                                    <div className="avatar placeholder">
                                        <div className="bg-teal-600 text-white rounded-full w-10 h-10 flex items-center justify-center">
                                            <span className="text-lg font-semibold">{userName.charAt(0).toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">
                                            {empId} - {userName}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {currentDateTime}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                className="btn btn-primary gap-2" 
                                onClick={handleOpenCart}
                                disabled={totalCartItems === 0}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Cart {totalCartItems > 0 && (
                                    <span className="badge badge-secondary">{totalCartItems}</span>
                                )}
                            </button>
                        </div>

                        {/* Form Fields Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text text-cyan-600 font-semibold">Department</span>
                                </label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        className="input input-bordered w-full bg-base-200 cursor-not-allowed" 
                                        value={empDepartment}
                                        readOnly
                                    />
                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text text-cyan-600 font-semibold">Prodline</span>
                                </label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        className="input input-bordered w-full bg-base-200 cursor-not-allowed" 
                                        value={empProdline}
                                        readOnly
                                    />
                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text text-cyan-600 font-semibold">Approved By <span className="text-red-500">*</span></span>
                                </label>
                                <select 
                                    className="select select-bordered w-full"
                                    value={selectedApprover}
                                    onChange={(e) => setSelectedApprover(e.target.value)}
                                >
                                    <option value="">--Select Approver--</option>
                                    {!_.isEmpty(approvers) ? (
                                        approvers.map((approver) => (
                                            <option key={approver.id} value={approver.name}>
                                                {approver.name}
                                            </option>
                                        ))
                                    ) : (
                                        <option value="" disabled>No approvers available</option>
                                    )}
                                </select>
                            </div>
                        </div>

                        {/* Tabs Section */}
                        <div>
                            <div role="tablist" className="tabs tabs-bordered">
                                <button
                                    role="tab"
                                    className={`tab ${activeTab === 'consumable' ? 'tab-active' : ''}`}
                                    onClick={() => handleTabChange('consumable')}
                                >
                                    Consumable
                                    {_.size(_.filter(cartItems, { type: 'consumable' })) > 0 && (
                                        <span className="ml-2 badge badge-sm badge-primary">
                                            {_.size(_.filter(cartItems, { type: 'consumable' }))}
                                        </span>
                                    )}
                                </button>
                                <button
                                    role="tab"
                                    className={`tab ${activeTab === 'supplies' ? 'tab-active' : ''}`}
                                    onClick={() => handleTabChange('supplies')}
                                >
                                    Supplies
                                    {_.size(_.filter(cartItems, { type: 'supplies' })) > 0 && (
                                        <span className="ml-2 badge badge-sm badge-primary">
                                            {_.size(_.filter(cartItems, { type: 'supplies' }))}
                                        </span>
                                    )}
                                </button>
                            </div>

                            <div className="mt-6">
                                {/* Search Bar */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                                    <div className="form-control w-full sm:w-auto sm:max-w-xs">
                                        <input 
                                            type="text" 
                                            placeholder="Search items..." 
                                            className="input input-bordered w-full" 
                                            value={searchTerm}
                                            onChange={(e) => handleSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Showing {total > 0 ? startIndex + 1 : 0} to {endIndex} of {total} items
                                    </div>
                                </div>

                                {/* Data Table */}
                                <div className="overflow-x-auto w-full">
                                    <table className="table table-zebra w-full">
                                        <thead>
                                            <tr>
                                                <th className="whitespace-nowrap text-center">Item Code</th>
                                                <th className="whitespace-nowrap">Description</th>
                                                <th className="whitespace-nowrap">
                                                    {activeTab === 'consumable' ? 'Detailed Description' : 'Bin Location'}
                                                </th>
                                                <th className="whitespace-nowrap text-center">Available Qty</th>
                                                <th className="whitespace-nowrap text-center">UOM</th>
                                                <th className="whitespace-nowrap text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {!_.isEmpty(items) ? (
                                                items.map((item, index) => (
                                                    <tr key={`${item.id}-${item.detail_id || index}`}>
                                                        <td className="font-medium whitespace-nowrap text-center">{item.itemCode}</td>
                                                        <td className="whitespace-nowrap">{item.description}</td>
                                                        <td className="min-w-[200px]">
                                                            {activeTab === 'consumable' ? item.detailedDescription : item.binLocation}
                                                        </td>
                                                        <td className="whitespace-nowrap text-center">
                                                            {item.quantity <= 0 ? (
                                                                <span className="badge badge-error">0 (Out of Stock)</span>
                                                            ) : (
                                                                item.quantity
                                                            )}
                                                        </td>
                                                        <td className="whitespace-nowrap text-center">{item.uom}</td>
                                                        <td className="whitespace-nowrap text-center">
                                                            <button 
                                                                className="btn btn-sm btn-primary gap-2"
                                                                onClick={() => handleAddToCart(item)}
                                                                disabled={item.quantity <= 0}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                                                </svg>
                                                                {item.quantity <= 0 ? 'Out of Stock' : 'Add to Cart'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="6" className="text-center py-8 text-gray-500">
                                                        {searchTerm ? 'No items found matching your search' : 'No items available'}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {total > 0 && totalPages > 1 && (
                                    <div className="flex justify-center mt-4 overflow-x-auto">
                                        <div className="join">
                                            <button 
                                                className="join-item btn btn-sm"
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                            >
                                                «
                                            </button>
                                            {generatePageNumbers().map((page, idx) => (
                                                page === '...' ? (
                                                    <button key={`ellipsis-${idx}`} className="join-item btn btn-sm btn-disabled">
                                                        ...
                                                    </button>
                                                ) : (
                                                    <button
                                                        key={page}
                                                        className={`join-item btn btn-sm ${currentPage === page ? 'btn-active' : ''}`}
                                                        onClick={() => handlePageChange(page)}
                                                    >
                                                        {page}
                                                    </button>
                                                )
                                            ))}
                                            <button 
                                                className="join-item btn btn-sm"
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                            >
                                                »
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cart Modal */}
                {isCartModalOpen && (
                    <div className="modal modal-open">
                        <div className="modal-box max-w-7xl">
                            <h3 className="font-bold text-lg mb-4 flex justify-between items-center">
                                <span>Shopping Cart</span>
                                <span className="text-sm font-normal text-gray-500">
                                    Total Items: {totalCartItems}
                                </span>
                            </h3>
                            
                            <div className="flex gap-2 mb-4">
                                {_.map(['consumable', 'supplies'], (type) => {
                                    const count = _.size(_.filter(cartItems, { type }));
                                    if (count === 0) return null;
                                    return (
                                        <div key={type} className="badge badge-lg badge-primary gap-2">
                                            {type === 'consumable' ? 'Consumable' : 'Supplies'}: {count} item{count !== 1 ? 's' : ''}
                                        </div>
                                    );
                                })}
                            </div>

                            {!_.isEmpty(cartItems) ? (
                                <div className="overflow-x-auto">
                                    <table className="table table-zebra w-full">
                                        <thead>
                                            <tr>
                                                <th className="text-center">Type</th>
                                                <th className="text-center">Item Code</th>
                                                <th>Description</th>
                                                <th>Details / Bin</th>
                                                <th className="text-center">Available</th>
                                                <th className="text-center">UOM</th>
                                                <th className="text-center">Request Qty</th>
                                                <th className="min-w-[200px]">Remarks</th>
                                                <th className="text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cartItems.map((item, index) => (
                                                <tr key={`cart-${item.id}-${item.detail_id || ''}-${item.type}-${index}`}>
                                                    <td className="text-center">
                                                        <span className={`badge ${item.type === 'consumable' ? 'badge-info' : 'badge-success'}`}>
                                                            {item.type === 'consumable' ? 'Consumable' : 'Supplies'}
                                                        </span>
                                                    </td>
                                                    <td className="text-center font-medium">{item.itemCode}</td>
                                                    <td>{item.description}</td>
                                                    <td>{item.type === 'consumable' ? item.detailedDescription : item.binLocation}</td>
                                                    <td className="text-center">{item.quantity}</td>
                                                    <td className="text-center">{item.uom}</td>
                                                    <td className="text-center">
                                                        <input 
                                                            type="number" 
                                                            min="1"
                                                            max={item.quantity}
                                                            className="input input-bordered input-sm w-20 text-center" 
                                                            value={item.requestQuantity}
                                                            onChange={(e) => handleRequestQuantityChange(item.id, item.detail_id, item.type, e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input 
                                                            type="text"
                                                            className="input input-bordered input-sm w-full" 
                                                            placeholder="Optional remarks..."
                                                            value={item.remarks || ''}
                                                            onChange={(e) => handleItemRemarksChange(item.id, item.detail_id, item.type, e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="text-center">
                                                        <button 
                                                            className="btn btn-sm btn-error gap-2"
                                                            onClick={() => handleRemoveFromCart(item.id, item.detail_id, item.type)}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                            Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <p className="text-gray-500 text-lg">Your cart is empty</p>
                                    <p className="text-gray-400 text-sm mt-2">Add items from the catalog to get started</p>
                                </div>
                            )}
                            
                            <div className="modal-action">
                                <div className="flex gap-2 w-full justify-end">
                                    <button 
                                        className="btn" 
                                        onClick={handleCloseCart}
                                        disabled={isSubmitting}
                                    >
                                        Close
                                    </button>
                                    <button 
                                        className="btn btn-success gap-2" 
                                        disabled={_.isEmpty(cartItems) || isSubmitting || !selectedApprover}
                                        onClick={handleSubmitRequest}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="loading loading-spinner loading-sm"></span>
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Submit Request
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                            {!selectedApprover && !_.isEmpty(cartItems) && (
                                <div className="alert alert-warning mt-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span>Please select an approver before submitting the request.</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}