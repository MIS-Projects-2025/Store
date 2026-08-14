import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import { useState, useEffect } from "react";
import axios from "axios";
import { X, Search } from "lucide-react";
import { CheckCircleOutlined } from "@ant-design/icons";

// -------------------- Tab/Button Style --------------------
const outlineBtnStyle = (active = true, color = 'currentColor') => ({
    border: `2px ${active ? 'solid' : 'dashed'} ${color}`,
    color: color,
    backgroundColor: 'transparent',
    opacity: active ? 1 : 0.45,
});

export default function adminUser({ users }) {
    const [perPage, setPerPage] = useState(10);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editUserId, setEditUserId] = useState(null);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [employees, setEmployees] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [formData, setFormData] = useState({
        employee_id: '',
        employee_name: '',
        user_type: '',
        username: '',
        password: ''
    });

    // Debounce employee search
    useEffect(() => {
        if (employeeSearch.length >= 2 && !isEditMode) {
            const timer = setTimeout(() => searchEmployees(), 300);
            return () => clearTimeout(timer);
        } else {
            setEmployees([]);
        }
    }, [employeeSearch, isEditMode]);

    const searchEmployees = async () => {
        setIsSearching(true);
        try {
            const appPrefix = window.location.pathname.split('/')[1];
            const response = await axios.get(`/${appPrefix}/admin-user/search-employees`, {
                params: { search: employeeSearch }
            });
            const employeeData = response.data.employees || response.data;
            setEmployees(Array.isArray(employeeData) ? employeeData : []);
        } catch (error) {
            console.error('Error searching employees:', error);
            setEmployees([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleEdit = async (id) => {
        try {
            const appPrefix = window.location.pathname.split('/')[1];
            const response = await axios.get(`/${appPrefix}/admin-user/${id}/edit`);
            const user = response.data;
            setIsEditMode(true);
            setEditUserId(id);
            setFormData({
                employee_id: user.employee_id || '',
                employee_name: user.log_user || '',
                user_type: user.log_category.toString(),
                username: user.log_username || '',
                password: ''
            });
            setIsModalOpen(true);
        } catch (error) {
            console.error('Error fetching user:', error);
            alert('Failed to load user data');
        }
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this user?')) {
            const appPrefix = window.location.pathname.split('/')[1];
            router.delete(`/${appPrefix}/admin-user/${id}`, {
                onSuccess: () => alert('User deleted successfully'),
                onError:   () => alert('Failed to delete user'),
            });
        }
    };

    const handlePageChange = (url) => {
        if (url) router.visit(url, { preserveState: true, preserveScroll: true });
    };

    const handlePerPageChange = (e) => {
        const newPerPage = e.target.value;
        setPerPage(newPerPage);
        router.visit(route('adminUser'), {
            data: { per_page: newPerPage, search },
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearchChange = (e) => setSearch(e.target.value);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        router.visit(route('adminUser'), {
            data: { search, per_page: perPage },
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleClearSearch = () => {
        setSearch('');
        router.visit(route('adminUser'), {
            data: { per_page: perPage },
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleOpenModal = () => {
        setIsEditMode(false);
        setEditUserId(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsEditMode(false);
        setEditUserId(null);
        setFormData({ employee_id: '', employee_name: '', user_type: '', username: '', password: '' });
        setEmployeeSearch('');
        setEmployees([]);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEmployeeSelect = (employee) => {
        setFormData(prev => ({ ...prev, employee_id: employee.EMPID, employee_name: employee.EMPNAME }));
        setEmployeeSearch(employee.EMPNAME);
        setEmployees([]);
    };

    const handleEmployeeSearchChange = (e) => {
        const value = e.target.value;
        setEmployeeSearch(value);
        if (!value) {
            setFormData(prev => ({ ...prev, employee_id: '', employee_name: '' }));
            setEmployees([]);
        }
    };

    const handleSubmitUser = (e) => {
        e.preventDefault();
        if (!formData.employee_id || !formData.employee_name || !formData.user_type || !formData.username) {
            alert('Please fill in all required fields');
            return;
        }
        if (!isEditMode && !formData.password) {
            alert('Please enter a password');
            return;
        }
        const appPrefix = window.location.pathname.split('/')[1];
        if (isEditMode) {
            router.put(`/${appPrefix}/admin-user/${editUserId}`, formData, {
                onSuccess: () => { alert('User updated successfully'); handleCloseModal(); },
                onError:   () => alert('Failed to update user. Please check the form.'),
            });
        } else {
            router.post(`/${appPrefix}/admin-user`, formData, {
                onSuccess: () => { alert('User added successfully'); handleCloseModal(); },
                onError:   () => alert('Failed to add user. Please check the form.'),
            });
        }
    };

    const getUserTypeBadge = (category) => {
        const labels = { 1: 'Administrator', 2: 'Store Personnel' };
        return (
            <span
                className="badge badge-outline"
                style={{ backgroundColor: 'transparent', borderColor: 'currentColor', color: 'inherit' }}
            >
                {labels[category] || 'Unknown'}
            </span>
        );
    };

    const formatDate = (date) =>
        new Date(date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });

    return (
        <AuthenticatedLayout>
            <Head title="Administrator List" />

            <div className="p-6">
                {/* Page Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Administrator List</h1>
                    <button
                        onClick={handleOpenModal}
                        className="btn"
                        style={outlineBtnStyle(true)}
                    >
                        + Add User
                    </button>
                </div>

                {/* Controls Row */}
                <div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    {/* Per Page */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Show:</label>
                        <select
                            value={perPage}
                            onChange={handlePerPageChange}
                            className="select select-bordered select-sm"
                        >
                            {[5, 10, 25, 50, 100].map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                        <span className="text-sm">entries</span>
                    </div>

                    {/* Search */}
                    <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <Search className="h-4 w-4 text-base-content/40" />
                            </div>
                            <input
                                type="text"
                                value={search}
                                onChange={handleSearchChange}
                                placeholder="Search by name..."
                                className="input input-bordered input-sm w-full pl-9 pr-8"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-base-content/40 hover:text-base-content"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <button type="submit" className="btn btn-sm" style={outlineBtnStyle(true)}>
                            Search
                        </button>
                    </form>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                        <thead>
                            <tr>
                                <th>Date Created</th>
                                <th>Name</th>
                                <th>User Type</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.data && users.data.length > 0 ? (
                                users.data.map((user) => (
                                    <tr key={user.id} className="hover">
                                        <td className="text-base-content/70 text-sm">{formatDate(user.date_created)}</td>
                                        <td className="font-medium">{user.log_user}</td>
                                        <td>{getUserTypeBadge(user.log_category)}</td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(user.id)}
                                                    className="btn btn-sm"
                                                    style={{
                                                        border: '1.5px solid oklch(var(--in))',
                                                        color: 'oklch(var(--in))',
                                                        backgroundColor: 'transparent',
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="btn btn-sm"
                                                    style={{
                                                        border: '1.5px solid oklch(var(--er))',
                                                        color: 'oklch(var(--er))',
                                                        backgroundColor: 'transparent',
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="text-center py-8 text-base-content/50">
                                        No users found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {users.data && users.data.length > 0 && (
                    <div className="mt-4 flex justify-between items-center flex-wrap gap-2">
                        <div className="text-sm text-base-content/60">
                            Showing {users.from} to {users.to} of {users.total} entries
                        </div>
                        <div className="join">
                            <button
                                onClick={() => handlePageChange(users.first_page_url)}
                                disabled={!users.prev_page_url}
                                className="join-item btn btn-sm btn-outline"
                            >«</button>
                            <button
                                onClick={() => handlePageChange(users.prev_page_url)}
                                disabled={!users.prev_page_url}
                                className="join-item btn btn-sm btn-outline"
                            >‹</button>

                            {users.links && Array.isArray(users.links) &&
                                users.links.slice(1, -1).map((link, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handlePageChange(link.url)}
                                        disabled={!link.url}
                                        className="join-item btn btn-sm btn-outline"
                                        style={link.active ? { border: '2px solid currentColor', opacity: 1 } : {}}
                                    >
                                        {link.label}
                                    </button>
                                ))
                            }

                            <button
                                onClick={() => handlePageChange(users.next_page_url)}
                                disabled={!users.next_page_url}
                                className="join-item btn btn-sm btn-outline"
                            >›</button>
                            <button
                                onClick={() => handlePageChange(users.last_page_url)}
                                disabled={!users.next_page_url}
                                className="join-item btn btn-sm btn-outline"
                            >»</button>
                        </div>
                    </div>
                )}
            </div>

            {/* ================= ADD / EDIT MODAL ================= */}
            {isModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-md">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">
                                {isEditMode ? 'Edit Administrator Account' : 'Add Administrator Account'}
                            </h3>
                            <button className="btn btn-sm btn-circle btn-ghost" onClick={handleCloseModal}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitUser}>
                            {/* Employee Name */}
                            <div className="form-control w-full mb-4">
                                <label className="label">
                                    <span className="label-text font-medium">Employee Name</span>
                                </label>
                                {isEditMode ? (
                                    <div className="p-3 bg-base-200 rounded-lg border border-base-300">
                                        <div className="font-medium">{formData.employee_name}</div>
                                        <div className="text-sm text-base-content/50">ID: {formData.employee_id}</div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                <Search className="h-4 w-4 text-base-content/40" />
                                            </div>
                                            <input
                                                type="text"
                                                value={employeeSearch}
                                                onChange={handleEmployeeSearchChange}
                                                placeholder="Search by Employee ID or Name..."
                                                className="input input-bordered w-full pl-9"
                                                autoComplete="off"
                                                disabled={formData.employee_id !== ''}
                                            />
                                        </div>

                                        {isSearching && (
                                            <div className="mt-2 text-sm text-base-content/50">Searching…</div>
                                        )}

                                        {!formData.employee_id && employees.length > 0 && (
                                            <div className="mt-2 max-h-48 overflow-y-auto border border-base-300 rounded-lg bg-base-100 shadow-lg">
                                                {employees.map(emp => (
                                                    <div
                                                        key={emp.EMPID}
                                                        onClick={() => handleEmployeeSelect(emp)}
                                                        className="p-3 hover:bg-base-200 cursor-pointer border-b border-base-200 last:border-b-0"
                                                    >
                                                        <div className="font-medium">{emp.EMPNAME}</div>
                                                        <div className="text-sm text-base-content/50">ID: {emp.EMPLOYID}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {employeeSearch.length >= 2 && employees.length === 0 && !isSearching && !formData.employee_id && (
                                            <div className="mt-2 text-sm text-base-content/50">No employees found</div>
                                        )}

                                        {formData.employee_name && (
                                            <div className="mt-2 p-3 rounded-lg flex justify-between items-center"
                                                style={{ border: '1.5px solid oklch(var(--su))', backgroundColor: 'transparent' }}>
                                                <div>
                                                    <div className="text-sm font-medium" style={{ color: 'oklch(var(--su))' }}>
                                                        <CheckCircleOutlined className="mr-1" />
                                                        Selected Employee
                                                    </div>
                                                    <div className="font-medium">{formData.employee_name}</div>
                                                    <div className="text-sm text-base-content/50">ID: {formData.employee_id}</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, employee_id: '', employee_name: '' }));
                                                        setEmployeeSearch('');
                                                        setEmployees([]);
                                                    }}
                                                    className="btn btn-sm btn-circle btn-ghost"
                                                    title="Clear selection"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* User Type */}
                            <div className="form-control w-full mb-4">
                                <label className="label">
                                    <span className="label-text font-medium">User Type</span>
                                </label>
                                <select
                                    name="user_type"
                                    value={formData.user_type}
                                    onChange={handleFormChange}
                                    className="select select-bordered w-full"
                                    required
                                >
                                    <option value="">Select user type</option>
                                    <option value="1">Administrator</option>
                                    <option value="2">Store Personnel</option>
                                </select>
                            </div>

                            {/* Username */}
                            <div className="form-control w-full mb-4">
                                <label className="label">
                                    <span className="label-text font-medium">Username</span>
                                </label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleFormChange}
                                    placeholder="Enter username"
                                    className="input input-bordered w-full"
                                    required
                                />
                            </div>

                            {/* Password */}
                            <div className="form-control w-full mb-4">
                                <label className="label">
                                    <span className="label-text font-medium">
                                        Password{' '}
                                        {isEditMode && (
                                            <span className="text-xs text-base-content/50 ml-1">(leave blank to keep current)</span>
                                        )}
                                    </span>
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleFormChange}
                                    placeholder={isEditMode ? 'Enter new password (optional)' : 'Enter password'}
                                    className="input input-bordered w-full"
                                    required={!isEditMode}
                                />
                            </div>

                            {/* Modal Actions */}
                            <div className="modal-action">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="btn"
                                    style={outlineBtnStyle(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn"
                                    style={outlineBtnStyle(true)}
                                >
                                    {isEditMode ? 'Update User' : 'Add User'}
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="modal-backdrop" onClick={handleCloseModal}></div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}