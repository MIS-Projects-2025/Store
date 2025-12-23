import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import { useState, useEffect } from "react";
import axios from "axios";

export default function ConsignedUser({ users }) {
    const [perPage, setPerPage] = useState(10);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editUserId, setEditUserId] = useState(null);
    const [formData, setFormData] = useState({
        department: '',
        prodline: '',
        username: '',
        password: ''
    });
    
    // New state for dropdown options
    const [departments, setDepartments] = useState([]);
    const [prodlines, setProdlines] = useState([]);
    const [searchDepartments, setSearchDepartments] = useState('');
    const [searchProdlines, setSearchProdlines] = useState('');
    const [filteredDepartments, setFilteredDepartments] = useState([]);
    const [filteredProdlines, setFilteredProdlines] = useState([]);

    // Fetch departments and prodlines when modal opens
    useEffect(() => {
        if (isModalOpen) {
            fetchDepartmentsAndProdlines();
        }
    }, [isModalOpen]);

    // Filter departments based on search
    useEffect(() => {
        if (searchDepartments) {
            const filtered = departments.filter(dept => 
                dept.toLowerCase().includes(searchDepartments.toLowerCase())
            );
            setFilteredDepartments(filtered);
        } else {
            setFilteredDepartments(departments);
        }
    }, [searchDepartments, departments]);

    // Filter prodlines based on search
    useEffect(() => {
        if (searchProdlines) {
            const filtered = prodlines.filter(line => 
                line.toLowerCase().includes(searchProdlines.toLowerCase())
            );
            setFilteredProdlines(filtered);
        } else {
            setFilteredProdlines(prodlines);
        }
    }, [searchProdlines, prodlines]);

    const fetchDepartmentsAndProdlines = async () => {
        try {
            const appPrefix = window.location.pathname.split('/')[1];
            const response = await axios.get(`/${appPrefix}/consigned-user/options`);
            
            if (response.data.departments) {
                setDepartments(response.data.departments);
                setFilteredDepartments(response.data.departments);
            }
            
            if (response.data.prodlines) {
                setProdlines(response.data.prodlines);
                setFilteredProdlines(response.data.prodlines);
            }
        } catch (error) {
            console.error('Error fetching options:', error);
        }
    };

    const handleEdit = async (id) => {
        try {
            const appPrefix = window.location.pathname.split('/')[1];
            const response = await axios.get(`/${appPrefix}/consigned-user/${id}/edit`);
            const user = response.data;
            
            setIsEditMode(true);
            setEditUserId(id);
            setFormData({
                department: user.department || '',
                prodline: user.prodline || '',
                username: user.username || '',
                password: ''
            });
            setIsModalOpen(true);
        } catch (error) {
            console.error('Error fetching user:', error);
            alert('Failed to load user data');
        }
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this consigned user?')) {
            const appPrefix = window.location.pathname.split('/')[1];
            
            router.delete(`/${appPrefix}/consigned-user/${id}`, {
                onSuccess: () => {
                    alert('Consigned user deleted successfully');
                },
                onError: () => {
                    alert('Failed to delete consigned user');
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
        router.visit(route('consignedUser'), {
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
        router.visit(route('consignedUser'), {
            data: { search: search, per_page: perPage },
            preserveState: true,
            preserveScroll: true
        });
    };

    const handleClearSearch = () => {
        setSearch('');
        router.visit(route('consignedUser'), {
            data: { per_page: perPage },
            preserveState: true,
            preserveScroll: true
        });
    };

    const handleOpenModal = () => {
        setIsEditMode(false);
        setEditUserId(null);
        setFormData({
            department: '',
            prodline: '',
            username: '',
            password: ''
        });
        setSearchDepartments('');
        setSearchProdlines('');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsEditMode(false);
        setEditUserId(null);
        setFormData({
            department: '',
            prodline: '',
            username: '',
            password: ''
        });
        setSearchDepartments('');
        setSearchProdlines('');
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSelectDepartment = (department) => {
        setFormData(prev => ({
            ...prev,
            department
        }));
        setSearchDepartments('');
        setFilteredDepartments(departments);
    };

    const handleSelectProdline = (prodline) => {
        setFormData(prev => ({
            ...prev,
            prodline
        }));
        setSearchProdlines('');
        setFilteredProdlines(prodlines);
    };

    const handleClearDepartment = () => {
        setFormData(prev => ({
            ...prev,
            department: ''
        }));
        setSearchDepartments('');
    };

    const handleClearProdline = () => {
        setFormData(prev => ({
            ...prev,
            prodline: ''
        }));
        setSearchProdlines('');
    };

    const handleSubmitUser = (e) => {
        e.preventDefault();
        
        // Validate form
        if (!formData.department || !formData.prodline || !formData.username) {
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
            router.put(`/${appPrefix}/consigned-user/${editUserId}`, formData, {
                onSuccess: () => {
                    alert('Consigned user updated successfully');
                    handleCloseModal();
                },
                onError: (errors) => {
                    console.error('Validation errors:', errors);
                    alert('Failed to update consigned user. Please check the form.');
                }
            });
        } else {
            // Create new user
            router.post(`/${appPrefix}/consigned-user`, formData, {
                onSuccess: () => {
                    alert('Consigned user added successfully');
                    handleCloseModal();
                },
                onError: (errors) => {
                    console.error('Validation errors:', errors);
                    alert('Failed to add consigned user. Please check the form.');
                }
            });
        }
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
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
            <Head title="Consigned User List" />

            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Consigned User List</h1>
                    <button 
                        onClick={handleOpenModal}
                        className="btn btn-primary"
                    >
                        Add Consigned User
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
                                placeholder="Search by department, product line, or username..."
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
                                <th>Department</th>
                                <th>Product Line</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.data && users.data.length > 0 ? (
                                users.data.map((user) => (
                                    <tr key={user.id}>
                                        <td>{formatDate(user.date_created)}</td>
                                        <td>{user.department}</td>
                                        <td>{user.prodline}</td>
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
                                        No consigned users found
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
                            {isEditMode ? 'Edit Consigned User' : 'Add Consigned User'}
                        </h3>
                        
                        <form onSubmit={handleSubmitUser}>
                            {/* Username Field */}
                            <div className="form-control w-full mb-4">
                                <label className="label">
                                    <span className="label-text">Username</span>
                                    <span className="label-text-alt text-red-500">Required</span>
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

                            {/* Department - Search and Select */}
                            <div className="form-control w-full mb-4">
                                <label className="label">
                                    <span className="label-text">Department</span>
                                    <span className="label-text-alt text-red-500">Required</span>
                                </label>
                                
                                {/* Selected value display */}
                                {formData.department && (
                                    <div className="mb-2 flex items-center justify-between bg-base-200 p-2 rounded">
                                        <span className="font-medium">{formData.department}</span>
                                        <button 
                                            type="button"
                                            onClick={handleClearDepartment}
                                            className="btn btn-xs btn-ghost"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}
                                
                                {/* Search input */}
                                {!formData.department && (
                                    <>
                                        <input
                                            type="text"
                                            value={searchDepartments}
                                            onChange={(e) => setSearchDepartments(e.target.value)}
                                            placeholder="Search department..."
                                            className="input input-bordered w-full"
                                        />
                                        
                                        {/* Dropdown options */}
                                        {searchDepartments && filteredDepartments.length > 0 && (
                                            <div className="mt-1 bg-base-100 border border-base-300 rounded shadow-lg max-h-48 overflow-y-auto">
                                                {filteredDepartments.map((dept, index) => (
                                                    <div
                                                        key={index}
                                                        onClick={() => handleSelectDepartment(dept)}
                                                        className="p-2 hover:bg-base-200 cursor-pointer"
                                                    >
                                                        {dept}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* Show all departments if no search */}
                                        {!searchDepartments && departments.length > 0 && (
                                            <div className="mt-1 bg-base-100 border border-base-300 rounded shadow-lg max-h-48 overflow-y-auto">
                                                {departments.map((dept, index) => (
                                                    <div
                                                        key={index}
                                                        onClick={() => handleSelectDepartment(dept)}
                                                        className="p-2 hover:bg-base-200 cursor-pointer"
                                                    >
                                                        {dept}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* No results */}
                                        {searchDepartments && filteredDepartments.length === 0 && (
                                            <div className="mt-1 p-2 text-center text-gray-500">
                                                No departments found
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Product Line - Search and Select */}
                            <div className="form-control w-full mb-4">
                                <label className="label">
                                    <span className="label-text">Product Line</span>
                                    <span className="label-text-alt text-red-500">Required</span>
                                </label>
                                
                                {/* Selected value display */}
                                {formData.prodline && (
                                    <div className="mb-2 flex items-center justify-between bg-base-200 p-2 rounded">
                                        <span className="font-medium">{formData.prodline}</span>
                                        <button 
                                            type="button"
                                            onClick={handleClearProdline}
                                            className="btn btn-xs btn-ghost"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}
                                
                                {/* Search input */}
                                {!formData.prodline && (
                                    <>
                                        <input
                                            type="text"
                                            value={searchProdlines}
                                            onChange={(e) => setSearchProdlines(e.target.value)}
                                            placeholder="Search product line..."
                                            className="input input-bordered w-full"
                                        />
                                        
                                        {/* Dropdown options */}
                                        {searchProdlines && filteredProdlines.length > 0 && (
                                            <div className="mt-1 bg-base-100 border border-base-300 rounded shadow-lg max-h-48 overflow-y-auto">
                                                {filteredProdlines.map((line, index) => (
                                                    <div
                                                        key={index}
                                                        onClick={() => handleSelectProdline(line)}
                                                        className="p-2 hover:bg-base-200 cursor-pointer"
                                                    >
                                                        {line}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* Show all prodlines if no search */}
                                        {!searchProdlines && prodlines.length > 0 && (
                                            <div className="mt-1 bg-base-100 border border-base-300 rounded shadow-lg max-h-48 overflow-y-auto">
                                                {prodlines.map((line, index) => (
                                                    <div
                                                        key={index}
                                                        onClick={() => handleSelectProdline(line)}
                                                        className="p-2 hover:bg-base-200 cursor-pointer"
                                                    >
                                                        {line}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* No results */}
                                        {searchProdlines && filteredProdlines.length === 0 && (
                                            <div className="mt-1 p-2 text-center text-gray-500">
                                                No product lines found
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Password */}
                            <div className="form-control w-full mb-6">
                                <label className="label">
                                    <span className="label-text">
                                        Password {isEditMode && <span className="text-xs text-gray-500">(leave blank to keep current)</span>}
                                    </span>
                                    {!isEditMode && <span className="label-text-alt text-red-500">Required</span>}
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