import { useState, useMemo, useEffect } from 'react';
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage, router } from "@inertiajs/react";

export default function Approval({ consumables = [], supplies = [], appPrefix = '/app' }) {
    const [activeTab, setActiveTab] = useState('consumable');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loadingItems, setLoadingItems] = useState(false);
    const [orderItems, setOrderItems] = useState([]);
    const [loadingAction, setLoadingAction] = useState(false);
    const itemsPerPage = 10;
    
    // Get current orders based on active tab
    const currentOrders = activeTab === 'consumable' ? consumables : supplies;

    // Filter orders based on search term - now includes employee name
    const filteredOrders = useMemo(() => {
        if (!searchTerm) return currentOrders;
        
        return currentOrders.filter(order => 
            Object.values(order).some(value => 
                value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [currentOrders, searchTerm]);

    // Calculate pagination
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    // Reset to page 1 when search term changes
    const handleSearch = (value) => {
        setSearchTerm(value);
        setCurrentPage(1);
    };

    // Handle tab change
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSearchTerm('');
        setCurrentPage(1);
    };

    // Get status badge
    const getStatusBadge = (status) => {
        switch (status.toLowerCase()) {
            case 'pending':
                return <span className="badge badge-warning">Pending</span>;
            case 'approved':
                return <span className="badge badge-success">Approved</span>;
            case 'rejected':
                return <span className="badge badge-error">Rejected</span>;
            default:
                return <span className="badge badge-ghost">{status}</span>;
        }
    };

    const fetchOrderItems = async (mrsNo) => {
        setLoadingItems(true);
        try {
            // Debug: log what we're trying to fetch
            console.log(`Fetching items for MRS: ${mrsNo}, type: ${activeTab}`);
            
            // Use the appPrefix prop that's passed from Laravel
            const prefix = appPrefix || '/ims';
            console.log(`Using prefix: ${prefix}`);
            
            const response = await fetch(`${prefix}/approval/${activeTab}/${mrsNo}`, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                }
            });
            
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response error:', errorText);
                throw new Error(`Failed to fetch: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('API Response data:', data);
            console.log('Items in response:', data.items);
            console.log('Items length:', data.items?.length);
            
            // Store items
            setOrderItems(data.items || []);
            return data;
            
        } catch (error) {
            console.error('Error fetching order items:', error);
            setOrderItems([]);
            return { items: [] };
        } finally {
            setLoadingItems(false);
        }
    };

    // Handle view action - open modal with order details
    const handleView = async (order) => {
        console.log('Opening modal for order:', order);
        console.log('MRS No:', order.mrsNo);
        
        // First, set the selected order (without items initially)
        setSelectedOrder(order);
        setIsModalOpen(true);
        
        // Then fetch the items
        const orderData = await fetchOrderItems(order.mrsNo);
        console.log('Fetched order data:', orderData);
        console.log('Fetched items:', orderData?.items);
        
        // Update selected order with full details including items
        if (orderData) {
            setSelectedOrder(prev => ({
                ...prev,
                items: orderData.items || [],
                remarks: orderData.remarks || null
            }));
        }
    };

    // Close modal
    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedOrder(null);
        setOrderItems([]);
    };

    // Format date for display
    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    };

    // Format currency
    const formatCurrency = (amount) => {
        return `₱${parseFloat(amount || 0).toFixed(2)}`;
    };

    // Handle Approve action
    const handleApprove = async (order) => {
        if (loadingAction) return;
        
        if (!confirm(`Are you sure you want to approve order ${order.mrsNo}?`)) {
            return;
        }
        
        setLoadingAction(true);
        try {
            // Use Inertia.js post method to maintain session and CSRF protection
            router.post(`${appPrefix}/approval/${activeTab}/${order.mrsNo}/approve`, {}, {
                preserveScroll: true,
                onSuccess: () => {
                    // Refresh the page to show updated status
                    router.reload({ only: ['consumables', 'supplies'] });
                },
                onError: (errors) => {
                    alert(`Failed to approve order: ${errors.message || 'Unknown error'}`);
                }
            });
            
        } catch (error) {
            console.error('Error approving order:', error);
            alert('Failed to approve order. Please try again.');
        } finally {
            setLoadingAction(false);
        }
    };

    // Handle Reject action
    const handleReject = async (order) => {
        if (loadingAction) return;
        
        if (!confirm(`Are you sure you want to reject order ${order.mrsNo}?`)) {
            return;
        }
        
        setLoadingAction(true);
        try {
            // Use Inertia.js post method to maintain session and CSRF protection
            router.post(`${appPrefix}/approval/${activeTab}/${order.mrsNo}/reject`, {}, {
                preserveScroll: true,
                onSuccess: () => {
                    // Refresh the page to show updated status
                    router.reload({ only: ['consumables', 'supplies'] });
                },
                onError: (errors) => {
                    alert(`Failed to reject order: ${errors.message || 'Unknown error'}`);
                }
            });
            
        } catch (error) {
            console.error('Error rejecting order:', error);
            alert('Failed to reject order. Please try again.');
        } finally {
            setLoadingAction(false);
        }
    };

    // Render order items details WITHOUT Total Price column
const renderOrderItems = (items, orderType = activeTab) => {
    console.log('Render order items called with:', items);
    console.log('Order type:', orderType);
    console.log('Is array?', Array.isArray(items));
    console.log('Length:', items?.length);
    
    if (!items || !Array.isArray(items) || items.length === 0) {
        console.log('No items to render');
        return (
            <div className="text-center text-gray-500 py-8">
                No items found in this order
            </div>
        );
    }

    console.log('Rendering items:', items);
    
    // Always show detailedDescription column for both types
    return (
        <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
                <thead>
                    <tr className="bg-base-200">
                        <th className="text-left font-semibold">Item Code</th>
                        <th className="text-left font-semibold">Description</th>
                        <th className="text-left font-semibold">Detailed Description</th> {/* Always show */}
                        <th className="text-center font-semibold">Quantity</th>
                        <th className="text-center font-semibold">Unit</th>
                        <th className="text-right font-semibold">Unit Price</th>
                        <th className="text-right font-semibold">Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => (
                        <tr key={index} className="hover">
                            <td className="whitespace-nowrap font-medium">
                                {item.itemCode || 'N/A'}
                            </td>
                            <td className="min-w-[200px]">
                                {item.mat_description || 'N/A'}
                            </td>
                            <td className="min-w-[250px]"> {/* Always show */}
                                {item.detailedDescription || item.detailed_description || 'N/A'}
                            </td>
                            <td className="text-center whitespace-nowrap">
                                {item.quantity || 0}
                            </td>
                            <td className="text-center whitespace-nowrap">
                                {item.unit || 'pcs'}
                            </td>
                            <td className="text-right whitespace-nowrap">
                                {formatCurrency(item.unitPrice)}
                            </td>
                            <td className="text-right whitespace-nowrap">
                                {item.remarks || 'N/A'}
                            </td>                               
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

    return (
        <AuthenticatedLayout>
            <Head title="Approval Request" />
            
            <div className="p-4">
                <h1 className="text-xl font-semibold mb-4">Approval Request</h1>

                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        {/* Tabs Section */}
                        <div>
                            <div role="tablist" className="tabs tabs-bordered">
                                <button
                                    role="tab"
                                    className={`tab ${activeTab === 'consumable' ? 'tab-active' : ''}`}
                                    onClick={() => handleTabChange('consumable')}
                                >
                                    Consumable ({consumables.length})
                                </button>
                                <button
                                    role="tab"
                                    className={`tab ${activeTab === 'supplies' ? 'tab-active' : ''}`}
                                    onClick={() => handleTabChange('supplies')}
                                >
                                    Supplies ({supplies.length})
                                </button>
                            </div>

                            <div className="mt-6">
                                {/* Search Bar */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                                    <div className="form-control" style={{ width: "400px" }}>
                                        <input 
                                            type="text" 
                                            placeholder="Search by MRS No, Employee, or Department..." 
                                            className="input input-bordered w-full" 
                                            value={searchTerm}
                                            onChange={(e) => handleSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Showing {filteredOrders.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
                                    </div>
                                </div>

                                {/* Data Table */}
                                <div className="overflow-x-auto w-full">
                                    <table className="table table-zebra w-full">
                                        <thead>
                                            <tr>
                                                <th className="whitespace-nowrap text-center">Date Order</th>
                                                <th className="whitespace-nowrap text-center">MRS No.</th>
                                                <th className="whitespace-nowrap">Employee No.</th>
                                                <th className="whitespace-nowrap">Employee Name</th>
                                                <th className="whitespace-nowrap">Department</th>
                                                <th className="whitespace-nowrap text-center">Items</th>
                                                <th className="whitespace-nowrap text-center">Status</th>
                                                <th className="whitespace-nowrap text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedOrders.length > 0 ? (
                                                paginatedOrders.map((order, index) => (
                                                    <tr key={`${order.mrsNo}-${index}`}>
                                                        <td className="whitespace-nowrap text-center">
                                                            {formatDate(order.dateOrder)}
                                                        </td>
                                                        <td className="whitespace-nowrap text-center font-medium">
                                                            {order.mrsNo}
                                                        </td>
                                                        <td className="whitespace-nowrap">
                                                            {order.employeeNo}
                                                        </td>
                                                        <td className="whitespace-nowrap">
                                                            {order.employeeName || 'N/A'}
                                                        </td>
                                                        <td className="whitespace-nowrap">
                                                            {order.department}
                                                        </td>
                                                        <td className="whitespace-nowrap text-center">
                                                            <span className="badge badge-info">
                                                                {order.itemCount || 0}
                                                            </span>
                                                        </td>
                                                        <td className="whitespace-nowrap text-center">
                                                            {getStatusBadge(order.status)}
                                                        </td>
                                                        <td className="whitespace-nowrap text-center">
                                                            <div className="flex gap-2 justify-center">
                                                                <button 
                                                                    className="btn btn-sm btn-info gap-1"
                                                                    onClick={() => handleView(order)}
                                                                    title="View Details"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                    View
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="8" className="text-center py-8 text-gray-500">
                                                        {searchTerm ? 'No orders found matching your search' : 'No orders available'}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {filteredOrders.length > 0 && totalPages > 1 && (
                                    <div className="flex justify-center mt-4 overflow-x-auto">
                                        <div className="join">
                                            <button 
                                                className="join-item btn btn-sm"
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={currentPage === 1}
                                            >
                                                «
                                            </button>
                                            {[...Array(totalPages)].map((_, index) => (
                                                <button
                                                    key={index + 1}
                                                    className={`join-item btn btn-sm ${currentPage === index + 1 ? 'btn-active' : ''}`}
                                                    onClick={() => setCurrentPage(index + 1)}
                                                >
                                                    {index + 1}
                                                </button>
                                            ))}
                                            <button 
                                                className="join-item btn btn-sm"
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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

                {/* Modal for viewing order details */}
                {isModalOpen && selectedOrder && (
                    <div className="modal modal-open">
                        <div className="modal-box max-w-7xl max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold">Order Details</h3>
                                <button 
                                    className="btn btn-sm btn-circle"
                                    onClick={closeModal}
                                >
                                    ✕
                                </button>
                            </div>
                            
                            {/* Order Header Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div className="bg-base-200 p-4 rounded-lg">
                                    <h4 className="font-semibold mb-2">Order Information</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">MRS No:</span>
                                            <span className="font-medium">{selectedOrder.mrsNo}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Date Ordered:</span>
                                            <span>{formatDate(selectedOrder.dateOrder)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Status:</span>
                                            <span>{getStatusBadge(selectedOrder.status)}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-base-200 p-4 rounded-lg">
                                    <h4 className="font-semibold mb-2">Requester Information</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Employee No:</span>
                                            <span className="font-medium">{selectedOrder.employeeNo}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Employee Name:</span>
                                            <span className="font-medium">{selectedOrder.employeeName || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Department:</span>
                                            <span>{selectedOrder.department}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Order Items */}
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-semibold">Order Items</h4>
                                    <div className="badge badge-info">
                                        {selectedOrder.items ? selectedOrder.items.length : 0} items
                                    </div>
                                </div>
                                
                                {loadingItems ? (
                                    <div className="flex justify-center items-center py-12">
                                        <span className="loading loading-spinner loading-lg text-primary"></span>
                                        <span className="ml-3 text-gray-600">Loading items...</span>
                                    </div>
                                ) : (
                                    renderOrderItems(selectedOrder.items || [], activeTab)
                                )}
                            </div>
                            
                            {/* Modal Actions */}
                            <div className="modal-action">
                                {selectedOrder.status === 'pending' ? (
                                    <>
                                        <button 
                                            className="btn btn-primary"
                                            onClick={() => handleApprove(selectedOrder)}
                                            disabled={loadingAction}
                                        >
                                            {loadingAction ? (
                                                <span className="loading loading-spinner loading-sm"></span>
                                            ) : 'Approve'}
                                        </button>
                                        <button 
                                            className="btn btn-error"
                                            onClick={() => handleReject(selectedOrder)}
                                            disabled={loadingAction}
                                        >
                                            {loadingAction ? (
                                                <span className="loading loading-spinner loading-sm"></span>
                                            ) : 'Reject'}
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-sm text-gray-500 italic">
                                        This order has already been {selectedOrder.status}
                                    </div>
                                )}
                                <button className="btn btn-ghost" onClick={closeModal}>
                                    Close
                                </button>
                            </div>
                        </div>
                        <div className="modal-backdrop" onClick={closeModal}></div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}