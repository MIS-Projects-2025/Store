import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import { useState, useEffect } from "react";
import axios from "axios";

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
            const timer = setTimeout(() => {
                searchEmployees();
            }, 300);
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
                username: user.log_user || '',
                password: '' // Empty password for edit
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
                onSuccess: () => {
                    alert('User deleted successfully');
                },
                onError: () => {
                    alert('Failed to delete user');
                }
            });
        }
    };

    const handlePageChange = (url) => {
        if (url) {
            router.visit(url, {
                preserveState: true,
                preserveScroll: true
            });
        }
    };

    const handlePerPageChange = (e) => {
        const newPerPage = e.target.value;
        setPerPage(newPerPage);
        router.visit(route('adminUser'), {
            data: { per_page: newPerPage, search: search },
            preserveState: true,
            preserveScroll: true
        });
    };

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearch(value);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        router.visit(route('adminUser'), {
            data: { search: search, per_page: perPage },
            preserveState: true,
            preserveScroll: true
        });
    };

    const handleClearSearch = () => {
        setSearch('');
        router.visit(route('adminUser'), {
            data: { per_page: perPage },
            preserveState: true,
            preserveScroll: true
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
        setFormData({
            employee_id: '',
            employee_name: '',
            user_type: '',
            username: '',
            password: ''
        });
        setEmployeeSearch('');
        setEmployees([]);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleEmployeeSelect = (employee) => {
        setFormData(prev => ({
            ...prev,
            employee_id: employee.EMPID,
            employee_name: employee.EMPNAME
        }));
        setEmployeeSearch(employee.EMPNAME);
        setEmployees([]);
    };

    const handleEmployeeSearchChange = (e) => {
        const value = e.target.value;
        setEmployeeSearch(value);
        if (!value) {
            setFormData(prev => ({
                ...prev,
                employee_id: '',
                employee_name: ''
            }));
            setEmployees([]);
        }
    };

    const handleSubmitUser = (e) => {
        e.preventDefault();
        
        // Validate form
        if (!formData.employee_id || !formData.employee_name || !formData.user_type || !formData.username) {
            alert('Please fill in all required fields');
            return;
        }

        // For edit mode, password is optional
        if (!isEditMode && !formData.password) {
            alert('Please enter a password');
            return;
        }

        const appPrefix = window.location.pathname.split('/')[1];

        if (isEditMode) {
            // Update existing user
            router.put(`/${appPrefix}/admin-user/${editUserId}`, formData, {
                onSuccess: () => {
                    alert('User updated successfully');
                    handleCloseModal();
                },
                onError: (errors) => {
                    console.error('Validation errors:', errors);
                    alert('Failed to update user. Please check the form.');
                }
            });
        } else {
            // Create new user
            router.post(`/${appPrefix}/admin-user`, formData, {
                onSuccess: () => {
                    alert('User added successfully');
                    handleCloseModal();
                },
                onError: (errors) => {
                    console.error('Validation errors:', errors);
                    alert('Failed to add user. Please check the form.');
                }
            });
        }
    };

    const getUserType = (category) => {
        const types = {
            1: 'Administrator',
            2: 'Store Personnel',
        };
        return types[category] || 'Unknown';
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Administrator List" />

            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Administrator List</h1>
                    <button 
                        onClick={handleOpenModal}
                        className="btn btn-primary"
                    >
                        Add User
                    </button>
                </div>

                {/* Controls Row */}
                <div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    {/* Per Page Selector */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Show:</label>
                        <select 
                            value={perPage} 
                            onChange={handlePerPageChange}
                            className="select select-bordered select-sm"
                        >
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                        <span className="text-sm">entries</span>
                    </div>

                    {/* Search Bar */}
                    <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-auto">
                        <div className="join w-full sm:w-auto">
                            <input
                                type="text"
                                value={search}
                                onChange={handleSearchChange}
                                placeholder="Search by name..."
                                className="input input-bordered input-sm join-item w-full sm:w-64"
                            />
                            <button
                                type="submit"
                                className="btn btn-sm btn-primary join-item"
                            >
                                Search
                            </button>
                        </div>
                        {search && (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                className="btn btn-sm btn-ghost"
                            >
                                Clear
                            </button>
                        )}
                    </form>
                </div>

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
                                    <tr key={user.id}>
                                        <td>{formatDate(user.date_created)}</td>
                                        <td>{user.log_user}</td>
                                        <td>
                                            <span className="badge badge-primary">
                                                {getUserType(user.log_category)}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(user.id)}
                                                    className="btn btn-sm btn-info"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="btn btn-sm btn-error"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="text-center">
                                        No users found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {users.data && users.data.length > 0 && (
                    <div className="mt-4 flex justify-between items-center">
                        <div className="text-sm">
                            Showing {users.from} to {users.to} of {users.total} entries
                        </div>
                        <div className="join">
                            <button 
                                onClick={() => handlePageChange(users.first_page_url)}
                                disabled={!users.prev_page_url}
                                className="join-item btn btn-sm"
                            >
                                «
                            </button>
                            <button 
                                onClick={() => handlePageChange(users.prev_page_url)}
                                disabled={!users.prev_page_url}
                                className="join-item btn btn-sm"
                            >
                                ‹
                            </button>
                            
                            {users.links && Array.isArray(users.links) && users.links.slice(1, -1).map((link, index) => (
                                <button
                                    key={index}
                                    onClick={() => handlePageChange(link.url)}
                                    className={`join-item btn btn-sm ${link.active ? 'btn-active' : ''}`}
                                    disabled={!link.url}
                                >
                                    {link.label}
                                </button>
                            ))}
                            
                            <button 
                                onClick={() => handlePageChange(users.next_page_url)}
                                disabled={!users.next_page_url}
                                className="join-item btn btn-sm"
                            >
                                ›
                            </button>
                            <button 
                                onClick={() => handlePageChange(users.last_page_url)}
                                disabled={!users.next_page_url}
                                className="join-item btn btn-sm"
                            >
                                »
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Edit User Modal */}
            {isModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-md">
                        <h3 className="font-bold text-lg mb-4">
                            {isEditMode ? 'Edit Administrator Account' : 'Add Administrator Account'}
                        </h3>
                        
                        <form onSubmit={handleSubmitUser}>
                            {/* Employee Name - Non-editable in Edit Mode */}
                            <div className="form-control w-full mb-4">
                                <label className="label">
                                    <span className="label-text">Employee Name</span>
                                </label>
                                {isEditMode ? (
                                    // Display as readonly field in edit mode
                                    <div className="p-3 bg-base-200 rounded-lg border border-base-300">
                                        <div className="font-medium">{formData.employee_name}</div>
                                        <div className="text-sm text-gray-500">ID: {formData.employee_id}</div>
                                    </div>
                                ) : (
                                    // Searchable field in add mode
                                    <>
                                        <input
                                            type="text"
                                            value={employeeSearch}
                                            onChange={handleEmployeeSearchChange}
                                            placeholder="Search by Employee ID or Name..."
                                            className="input input-bordered w-full"
                                            autoComplete="off"
                                            disabled={formData.employee_id !== ''}
                                        />
                                        {isSearching && (
                                            <div className="mt-2 text-sm text-gray-500">Searching...</div>
                                        )}
                                        {!formData.employee_id && employees.length > 0 && (
                                            <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg bg-base-100 shadow-lg">
                                                {employees.map(emp => (
                                                    <div
                                                        key={emp.EMPID}
                                                        onClick={() => handleEmployeeSelect(emp)}
                                                        className="p-3 hover:bg-base-200 cursor-pointer border-b last:border-b-0"
                                                    >
                                                        <div className="font-medium">{emp.EMPNAME}</div>
                                                        <div className="text-sm text-gray-500">ID: {emp.EMPLOYID}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {employeeSearch.length >= 2 && employees.length === 0 && !isSearching && !formData.employee_id && (
                                            <div className="mt-2 text-sm text-gray-500">No employees found</div>
                                        )}
                                        {formData.employee_name && (
                                            <div className="mt-2 p-3 bg-success/10 rounded-lg flex justify-between items-center">
                                                <div>
                                                    <div className="text-sm font-medium text-success">Selected Employee:</div>
                                                    <div className="font-medium">{formData.employee_name}</div>
                                                    <div className="text-sm text-gray-500">ID: {formData.employee_id}</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            employee_id: '',
                                                            employee_name: ''
                                                        }));
                                                        setEmployeeSearch('');
                                                        setEmployees([]);
                                                    }}
                                                    className="btn btn-sm btn-ghost btn-circle"
                                                    title="Clear selection"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* User Type */}
                            <div className="form-control w-full mb-4">
                                <label className="label">
                                    <span className="label-text">User Type</span>
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
                                    <span className="label-text">Username</span>
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
                                    <span className="label-text">
                                        Password {isEditMode && <span className="text-xs text-gray-500">(leave blank to keep current)</span>}
                                    </span>
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleFormChange}
                                    placeholder={isEditMode ? "Enter new password (optional)" : "Enter password"}
                                    className="input input-bordered w-full"
                                    required={!isEditMode}
                                />
                            </div>

                            {/* Modal Actions */}
                            <div className="modal-action">
                                <button 
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="btn btn-ghost"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="btn btn-primary"
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