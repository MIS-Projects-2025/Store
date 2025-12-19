import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import { useState } from "react";

export default function Approval({ suppliesData = [], sparePartsData = [] }) {
    const [activeTab, setActiveTab] = useState("supplies");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState(null);
    const [selectedItems, setSelectedItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);

    const getStatusBadge = (status) => {
        const badges = {
            'Approved': 'badge-success',
            'Pending': 'badge-warning',
            'Rejected': 'badge-error'
        };
        return badges[status] || 'badge-ghost';
    };

    const handleViewClick = (mrsNo, type) => {
        setLoading(true);
        
        router.get(
            route('approval.details'),
            { mrs_no: mrsNo, type: type },
            {
                only: ['modalData'],
                preserveState: true,
                preserveScroll: true,
                onSuccess: (page) => {
                    const data = page.props.modalData;
                    if (data) {
                        setModalData(data);
                        setSelectedItems([]);
                        setIsModalOpen(true);
                    }
                },
                onError: (errors) => {
                    console.error('Error fetching request details:', errors);
                    alert('Failed to load request details');
                },
                onFinish: () => {
                    setLoading(false);
                }
            }
        );
    };

    const handleSelectItem = (itemId) => {
        setSelectedItems(prev => {
            if (prev.includes(itemId)) {
                return prev.filter(id => id !== itemId);
            } else {
                return [...prev, itemId];
            }
        });
    };

    const handleSelectAll = () => {
        if (modalData && modalData.items) {
            if (selectedItems.length === modalData.items.length) {
                setSelectedItems([]);
            } else {
                setSelectedItems(modalData.items.map(item => item.id));
            }
        }
    };

    const handleApprove = () => {
        if (selectedItems.length === 0) return;

        if (!confirm(`Are you sure you want to approve ${selectedItems.length} item(s)?`)) {
            return;
        }

        setProcessing(true);

        router.post(
            route('approval.approve'),
            {
                item_ids: selectedItems,
                mrs_no: modalData.header.mrs_no,
                type: modalData.type
            },
            {
                preserveState: false,
                onSuccess: () => {
                    alert('Items approved successfully!');
                    setIsModalOpen(false);
                    setSelectedItems([]);
                    setModalData(null);
                },
                onError: (errors) => {
                    console.error('Error approving items:', errors);
                    alert('Failed to approve items: ' + (errors.message || 'Unknown error'));
                },
                onFinish: () => {
                    setProcessing(false);
                }
            }
        );
    };

    const handleReject = () => {
        if (selectedItems.length === 0) return;

        const reason = prompt(`Please provide a reason for rejecting ${selectedItems.length} item(s):`);
        
        if (!reason || reason.trim() === '') {
            alert('Rejection reason is required');
            return;
        }

        setProcessing(true);

        router.post(
            route('approval.reject'),
            {
                item_ids: selectedItems,
                mrs_no: modalData.header.mrs_no,
                type: modalData.type,
                reason: reason
            },
            {
                preserveState: false,
                onSuccess: () => {
                    alert('Items rejected successfully!');
                    setIsModalOpen(false);
                    setSelectedItems([]);
                    setModalData(null);
                },
                onError: (errors) => {
                    console.error('Error rejecting items:', errors);
                    alert('Failed to reject items: ' + (errors.message || 'Unknown error'));
                },
                onFinish: () => {
                    setProcessing(false);
                }
            }
        );
    };

    const renderTable = (data, type) => (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-0">
                <div className="overflow-x-auto">
                    <table className="table table-zebra">
                        <thead>
                            <tr>
                                <th>Date Order</th>
                                <th>Mrs No.</th>
                                <th>Requestor</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length > 0 ? (
                                data.map((item, index) => (
                                    <tr key={index}>
                                        <td>{item.date_order}</td>
                                        <td>{item.mrs_no}</td>
                                        <td>{item.requestor}</td>
                                        <td>
                                            <span className={`badge ${getStatusBadge(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button 
                                                    className="btn btn-sm btn-info"
                                                    onClick={() => handleViewClick(item.mrs_no, type)}
                                                    disabled={loading}
                                                >
                                                    {loading ? 'Loading...' : 'View'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center">
                                        No data available
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    return (
        <AuthenticatedLayout>
            <Head title="Approval" />

            <div className="p-6">
                <h1 className="text-2xl font-bold mb-6">Approval</h1>

                {/* Tabbed Card */}
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        {/* Tabs */}
                        <div className="flex justify-between items-center mb-4">
                            <div className="tabs tabs-boxed">
                                <a 
                                    className={`tab ${activeTab === "spareParts" ? "tab-active" : ""}`}
                                    onClick={() => setActiveTab("spareParts")}
                                >
                                    Consumable and Spare Parts
                                </a>
                                <a 
                                    className={`tab ${activeTab === "supplies" ? "tab-active" : ""}`}
                                    onClick={() => setActiveTab("supplies")}
                                >
                                    Supplies
                                </a>
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="mt-4">
                            {activeTab === "spareParts" && renderTable(sparePartsData, "spareParts")}
                            {activeTab === "supplies" && renderTable(suppliesData, "supplies")}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && modalData && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-6xl">
                        <h3 className="font-bold text-lg mb-4">Request Details</h3>
                        
                        {/* Request Info Card */}
                        <div className="card bg-base-200 mb-4">
                            <div className="card-body p-4">
                                <div className="grid grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Date Order</p>
                                        <p className="font-semibold">{modalData.header.date_order}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">MRS No.</p>
                                        <p className="font-semibold">{modalData.header.mrs_no}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Requestor</p>
                                        <p className="font-semibold">{modalData.header.requestor}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Status</p>
                                        <span className={`badge ${getStatusBadge(modalData.header.status)}`}>
                                            {modalData.header.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="overflow-x-auto">
                            <table className="table table-zebra table-sm">
                                <thead>
                                    <tr>
                                        <th>
                                            <input 
                                                type="checkbox" 
                                                className="checkbox checkbox-sm"
                                                checked={selectedItems.length === modalData.items.length && modalData.items.length > 0}
                                                onChange={handleSelectAll}
                                                disabled={processing}
                                            />
                                        </th>
                                        <th>Item Code</th>
                                        <th>Material Description</th>
                                        <th>Detailed Description</th>
                                        <th>Quantity</th>
                                        <th>UOM</th>
                                        <th>Request Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {modalData.items.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                <input 
                                                    type="checkbox" 
                                                    className="checkbox checkbox-sm"
                                                    checked={selectedItems.includes(item.id)}
                                                    onChange={() => handleSelectItem(item.id)}
                                                    disabled={processing}
                                                />
                                            </td>
                                            <td>{item.itemCode}</td>
                                            <td>{item.material_description}</td>
                                            <td>{item.detailed_description}</td>
                                            <td>{item.quantity}</td>
                                            <td>{item.uom}</td>
                                            <td>{item.request_qty}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Modal Actions */}
                        <div className="modal-action">
                            <button 
                                className="btn btn-success"
                                disabled={selectedItems.length === 0 || processing}
                                onClick={handleApprove}
                            >
                                {processing ? 'Processing...' : `Approve Selected (${selectedItems.length})`}
                            </button>
                            <button 
                                className="btn btn-error"
                                disabled={selectedItems.length === 0 || processing}
                                onClick={handleReject}
                            >
                                {processing ? 'Processing...' : `Reject Selected (${selectedItems.length})`}
                            </button>
                            <button 
                                className="btn"
                                onClick={() => setIsModalOpen(false)}
                                disabled={processing}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop" onClick={() => !processing && setIsModalOpen(false)}></div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}