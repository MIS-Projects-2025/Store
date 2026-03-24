import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import { useState, useEffect } from "react";
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
} from '@ant-design/icons';
import { X } from "lucide-react";

// -------------------- Status Badge (border-only, theme-aware) --------------------
const getStatusBadge = (status) => {
    const cfgMap = {
        'Approved': { icon: <CheckCircleOutlined />, style: { borderColor: 'oklch(var(--su))', color: 'oklch(var(--su))' } },
        'Pending':  { icon: <ClockCircleOutlined />, style: { borderColor: 'oklch(var(--wa))', color: 'oklch(var(--wa))' } },
        'Rejected': { icon: <CloseCircleOutlined />, style: { borderColor: 'oklch(var(--er))', color: 'oklch(var(--er))' } },
    };
    const cfg = cfgMap[status] || { icon: null, style: { borderColor: 'currentColor', color: 'inherit' } };
    return (
        <span className="badge badge-outline gap-1" style={{ ...cfg.style, backgroundColor: 'transparent' }}>
            {cfg.icon}{status}
        </span>
    );
};

// -------------------- Tab Button Style --------------------
const tabBtnStyle = (isActive) => isActive
    ? { border: '2px solid currentColor', color: 'inherit', backgroundColor: 'transparent', opacity: 1 }
    : { border: '2px dashed currentColor', color: 'inherit', backgroundColor: 'transparent', opacity: 0.45 };

export default function Approval({ suppliesData = [], sparePartsData = [] }) {
    const [activeTab, setActiveTab]       = useState("supplies");
    const [isModalOpen, setIsModalOpen]   = useState(false);
    const [modalData, setModalData]       = useState(null);
    const [selectedItems, setSelectedItems] = useState([]);
    const [loading, setLoading]           = useState(false);
    const [processing, setProcessing]     = useState(false);

    // ==================== REAL-TIME BROADCASTING ====================
    useEffect(() => {
        if (typeof window.Echo === 'undefined') {
            console.error('Laravel Echo is not initialized');
            return;
        }

        const channel = window.Echo.channel('material-approval');
        channel.listen('.material.updated', (event) => {
            if (event.action === 'created' || event.action === 'approved' || event.action === 'rejected') {
                router.reload({
                    only: ['suppliesData', 'sparePartsData'],
                    preserveState: true,
                    preserveScroll: true,
                });
            }
        });

        channel.error((error) => console.error('Echo channel error:', error));

        window.Echo.connector.pusher.connection.bind('connected',    () => console.log('Pusher connected'));
        window.Echo.connector.pusher.connection.bind('disconnected', () => console.log('Pusher disconnected'));
        window.Echo.connector.pusher.connection.bind('error',    (err) => console.error('Pusher error:', err));

        return () => window.Echo.leave('material-approval');
    }, []);

    const handleViewClick = (mrsNo, type) => {
        setLoading(true);
        router.get(
            route('approval.details'),
            { mrs_no: mrsNo, type },
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
                onError: () => alert('Failed to load request details'),
                onFinish: () => setLoading(false),
            }
        );
    };

    const handleSelectItem  = (itemId) =>
        setSelectedItems(prev =>
            prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
        );

    const handleSelectAll = () => {
        if (!modalData?.items) return;
        setSelectedItems(
            selectedItems.length === modalData.items.length
                ? []
                : modalData.items.map(item => item.id)
        );
    };

    const handleApprove = () => {
        if (!selectedItems.length) return;
        if (!confirm(`Approve ${selectedItems.length} item(s)?`)) return;
        setProcessing(true);
        router.post(
            route('approval.approve'),
            { item_ids: selectedItems, mrs_no: modalData.header.mrs_no, type: modalData.type },
            {
                preserveState: false,
                onSuccess: () => { alert('Items approved!'); closeModal(); },
                onError: (errors) => alert('Failed: ' + (errors.message || 'Unknown error')),
                onFinish: () => setProcessing(false),
            }
        );
    };

    const handleReject = () => {
        if (!selectedItems.length) return;
        const reason = prompt(`Reason for rejecting ${selectedItems.length} item(s):`);
        if (!reason?.trim()) { alert('Rejection reason is required'); return; }
        setProcessing(true);
        router.post(
            route('approval.reject'),
            { item_ids: selectedItems, mrs_no: modalData.header.mrs_no, type: modalData.type, reason },
            {
                preserveState: false,
                onSuccess: () => { alert('Items rejected!'); closeModal(); },
                onError: (errors) => alert('Failed: ' + (errors.message || 'Unknown error')),
                onFinish: () => setProcessing(false),
            }
        );
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedItems([]);
        setModalData(null);
    };

    const renderTable = (data, type) => (
        <div className="overflow-x-auto">
            <table className="table table-zebra [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                <thead>
                    <tr>
                        <th>Date Order</th>
                        <th>MRS No.</th>
                        <th>Requestor</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {data.length > 0 ? data.map((item, index) => (
                        <tr key={index} className="hover">
                            <td>{item.date_order}</td>
                            <td><span className="font-semibold">{item.mrs_no}</span></td>
                            <td>{item.requestor}</td>
                            <td>{getStatusBadge(item.status)}</td>
                            <td>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ border: '1.5px solid currentColor', opacity: loading ? 0.5 : 1 }}
                                    onClick={() => handleViewClick(item.mrs_no, type)}
                                    disabled={loading}
                                >
                                    {loading ? 'Loading…' : 'View'}
                                </button>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="5" className="text-center py-8 text-base-content/50">
                                No data available
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    return (
        <AuthenticatedLayout>
            <Head title="Approval" />

            <div className="p-6">
                <h1 className="text-2xl font-bold mb-6">Approval</h1>

                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        {/* Tabs */}
                        <div className="flex gap-2 flex-wrap mb-4">
                            <button
                                style={tabBtnStyle(activeTab === "spareParts")}
                                className="px-5 py-2 rounded-lg font-semibold transition-all duration-200"
                                onClick={() => setActiveTab("spareParts")}
                            >
                                Consumable and Spare Parts
                            </button>
                            <button
                                style={tabBtnStyle(activeTab === "supplies")}
                                className="px-5 py-2 rounded-lg font-semibold transition-all duration-200"
                                onClick={() => setActiveTab("supplies")}
                            >
                                Supplies
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="mt-2">
                            {activeTab === "spareParts" && renderTable(sparePartsData, "spareParts")}
                            {activeTab === "supplies"   && renderTable(suppliesData,   "supplies")}
                        </div>
                    </div>
                </div>
            </div>

            {/* ================= MODAL ================= */}
            {isModalOpen && modalData && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-6xl">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Request Details</h3>
                            <button
                                className="btn btn-sm btn-circle btn-ghost"
                                onClick={closeModal}
                                disabled={processing}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Request Info */}
                        <div className="card bg-base-200 mb-4">
                            <div className="card-body p-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-sm text-base-content/50">Date Order</p>
                                        <p className="font-semibold">{modalData.header.date_order}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-base-content/50">MRS No.</p>
                                        <p className="font-semibold">{modalData.header.mrs_no}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-base-content/50">Requestor</p>
                                        <p className="font-semibold">{modalData.header.requestor}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-base-content/50">Status</p>
                                        <div className="mt-1">{getStatusBadge(modalData.header.status)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="overflow-x-auto">
                            <table className="table table-zebra table-sm [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
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
                                        <th>Long Description</th>
                                        <th>Quantity</th>
                                        <th>UOM</th>
                                        <th>Request Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {modalData.items.map((item) => (
                                        <tr key={item.id} className="hover">
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    className="checkbox checkbox-sm"
                                                    checked={selectedItems.includes(item.id)}
                                                    onChange={() => handleSelectItem(item.id)}
                                                    disabled={processing}
                                                />
                                            </td>
                                            <td><span className="font-mono text-xs">{item.itemCode}</span></td>
                                            <td>{item.material_description}</td>
                                            <td>{item.detailed_description}</td>
                                            <td>{item.quantity}</td>
                                            <td>{item.uom}</td>
                                            <td><span className="font-semibold">{item.request_qty}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Modal Actions */}
                        <div className="modal-action">
                            <button
                                className="btn"
                                style={{
                                    border: '2px solid oklch(var(--su))',
                                    color: 'oklch(var(--su))',
                                    backgroundColor: 'transparent',
                                    opacity: (selectedItems.length === 0 || processing) ? 0.4 : 1,
                                }}
                                disabled={selectedItems.length === 0 || processing}
                                onClick={handleApprove}
                            >
                                <CheckCircleOutlined />
                                {processing ? 'Processing…' : `Approve (${selectedItems.length})`}
                            </button>

                            <button
                                className="btn"
                                style={{
                                    border: '2px solid oklch(var(--er))',
                                    color: 'oklch(var(--er))',
                                    backgroundColor: 'transparent',
                                    opacity: (selectedItems.length === 0 || processing) ? 0.4 : 1,
                                }}
                                disabled={selectedItems.length === 0 || processing}
                                onClick={handleReject}
                            >
                                <CloseCircleOutlined />
                                {processing ? 'Processing…' : `Reject (${selectedItems.length})`}
                            </button>

                            <button
                                className="btn btn-outline"
                                onClick={closeModal}
                                disabled={processing}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop" onClick={() => !processing && closeModal()}></div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}