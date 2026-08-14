import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import { useState, useEffect } from "react";
import axios from "axios";
import { X, Search } from "lucide-react";
import { CheckCircleOutlined } from "@ant-design/icons";

// -------------------- Reusable border-only button style --------------------
const outlineBtnStyle = (active = true) => ({
    border: `2px ${active ? 'solid' : 'dashed'} currentColor`,
    color: 'inherit',
    backgroundColor: 'transparent',
    opacity: active ? 1 : 0.45,
});

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

    const [departments, setDepartments] = useState([]);
    const [prodlines, setProdlines] = useState([]);
    const [searchDepartments, setSearchDepartments] = useState('');
    const [searchProdlines, setSearchProdlines] = useState('');
    const [filteredDepartments, setFilteredDepartments] = useState([]);
    const [filteredProdlines, setFilteredProdlines] = useState([]);

    useEffect(() => {
        if (isModalOpen) fetchDepartmentsAndProdlines();
    }, [isModalOpen]);

    useEffect(() => {
        setFilteredDepartments(
            searchDepartments
                ? departments.filter(d => d.toLowerCase().includes(searchDepartments.toLowerCase()))
                : departments
        );
    }, [searchDepartments, departments]);

    useEffect(() => {
        setFilteredProdlines(
            searchProdlines
                ? prodlines.filter(l => l.toLowerCase().includes(searchProdlines.toLowerCase()))
                : prodlines
        );
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
            setFormData({ department: user.department || '', prodline: user.prodline || '', username: user.username || '', password: '' });
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
                onSuccess: () => alert('Consigned user deleted successfully'),
                onError:   () => alert('Failed to delete consigned user'),
            });
        }
    };

    const handlePageChange = (url) => {
        if (url) router.visit(url, { preserveState: true, preserveScroll: true });
    };

    const handlePerPageChange = (e) => {
        const newPerPage = e.target.value;
        setPerPage(newPerPage);
        router.visit(route('consignedUser'), { data: { per_page: newPerPage, search }, preserveState: true, preserveScroll: true });
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        router.visit(route('consignedUser'), { data: { search, per_page: perPage }, preserveState: true, preserveScroll: true });
    };

    const handleClearSearch = () => {
        setSearch('');
        router.visit(route('consignedUser'), { data: { per_page: perPage }, preserveState: true, preserveScroll: true });
    };

    const handleOpenModal = () => {
        setIsEditMode(false);
        setEditUserId(null);
        setFormData({ department: '', prodline: '', username: '', password: '' });
        setSearchDepartments('');
        setSearchProdlines('');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsEditMode(false);
        setEditUserId(null);
        setFormData({ department: '', prodline: '', username: '', password: '' });
        setSearchDepartments('');
        setSearchProdlines('');
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectDepartment = (department) => {
        setFormData(prev => ({ ...prev, department }));
        setSearchDepartments('');
        setFilteredDepartments(departments);
    };

    const handleSelectProdline = (prodline) => {
        setFormData(prev => ({ ...prev, prodline }));
        setSearchProdlines('');
        setFilteredProdlines(prodlines);
    };

    const handleSubmitUser = (e) => {
        e.preventDefault();
        if (!formData.department || !formData.prodline || !formData.username) {
            alert('Please fill in all required fields');
            return;
        }
        if (!isEditMode && !formData.password) {
            alert('Please enter a password');
            return;
        }
        const appPrefix = window.location.pathname.split('/')[1];
        if (isEditMode) {
            router.put(`/${appPrefix}/consigned-user/${editUserId}`, formData, {
                onSuccess: () => { alert('Consigned user updated successfully'); handleCloseModal(); },
                onError:   () => alert('Failed to update consigned user. Please check the form.'),
            });
        } else {
            router.post(`/${appPrefix}/consigned-user`, formData, {
                onSuccess: () => { alert('Consigned user added successfully'); handleCloseModal(); },
                onError:   () => alert('Failed to add consigned user. Please check the form.'),
            });
        }
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    // -------------------- Searchable Select Field --------------------
    const SearchableSelect = ({ label, required, selectedValue, searchValue, onSearchChange, filteredOptions, onSelect, onClear, placeholder, noResultsText }) => (
        <div className="form-control w-full mb-4">
            <label className="label">
                <span className="label-text font-medium">{label}</span>
                {required && <span className="label-text-alt" style={{ color: 'oklch(var(--er))' }}>Required</span>}
            </label>

            {selectedValue ? (
                // Selected state — show value with clear button
                <div
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ border: '1.5px solid oklch(var(--su))', backgroundColor: 'transparent' }}
                >
                    <div>
                        <div className="text-sm font-medium" style={{ color: 'oklch(var(--su))' }}>
                            <CheckCircleOutlined className="mr-1" />
                            Selected
                        </div>
                        <div className="font-medium">{selectedValue}</div>
                    </div>
                    <button type="button" onClick={onClear} className="btn btn-sm btn-circle btn-ghost" title="Clear">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                // Search + dropdown
                <>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Search className="h-4 w-4 text-base-content/40" />
                        </div>
                        <input
                            type="text"
                            value={searchValue}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder={placeholder}
                            className="input input-bordered w-full pl-9"
                            autoComplete="off"
                        />
                        {searchValue && (
                            <button
                                type="button"
                                onClick={() => onSearchChange('')}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-base-content/40 hover:text-base-content"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {filteredOptions.length > 0 && (
                        <div className="mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredOptions.map((opt, i) => (
                                <div
                                    key={i}
                                    onClick={() => onSelect(opt)}
                                    className="p-3 hover:bg-base-200 cursor-pointer border-b border-base-200 last:border-b-0 text-sm"
                                >
                                    {opt}
                                </div>
                            ))}
                        </div>
                    )}

                    {searchValue && filteredOptions.length === 0 && (
                        <div className="mt-1 p-2 text-center text-base-content/50 text-sm">{noResultsText}</div>
                    )}
                </>
            )}
        </div>
    );

    return (
        <AuthenticatedLayout>
            <Head title="Consigned User List" />

            <div className="p-6">
                {/* Page Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Consigned User List</h1>
                    <button onClick={handleOpenModal} className="btn" style={outlineBtnStyle(true)}>
                        + Add Consigned User
                    </button>
                </div>

                {/* Controls Row */}
                <div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    {/* Per Page */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Show:</label>
                        <select value={perPage} onChange={handlePerPageChange} className="select select-bordered select-sm">
                            {[5, 10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <span className="text-sm">entries</span>
                    </div>

                    {/* Search */}
                    <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-72">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <Search className="h-4 w-4 text-base-content/40" />
                            </div>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by department, product line..."
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
                                <th>Department</th>
                                <th>Product Line</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.data && users.data.length > 0 ? (
                                users.data.map((user) => (
                                    <tr key={user.id} className="hover">
                                        <td className="text-base-content/70 text-sm">{formatDate(user.date_created)}</td>
                                        <td>
                                            <span className="badge badge-outline" style={{ backgroundColor: 'transparent' }}>
                                                {user.department}
                                            </span>
                                        </td>
                                        <td>{user.prodline}</td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(user.id)}
                                                    className="btn btn-sm"
                                                    style={{ border: '1.5px solid oklch(var(--in))', color: 'oklch(var(--in))', backgroundColor: 'transparent' }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="btn btn-sm"
                                                    style={{ border: '1.5px solid oklch(var(--er))', color: 'oklch(var(--er))', backgroundColor: 'transparent' }}
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
                                        No consigned users found
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
                            <button onClick={() => handlePageChange(users.first_page_url)} disabled={!users.prev_page_url} className="join-item btn btn-sm btn-outline">«</button>
                            <button onClick={() => handlePageChange(users.prev_page_url)}  disabled={!users.prev_page_url} className="join-item btn btn-sm btn-outline">‹</button>

                            {users.links && Array.isArray(users.links) && users.links.slice(1, -1).map((link, index) => (
                                <button
                                    key={index}
                                    onClick={() => handlePageChange(link.url)}
                                    disabled={!link.url}
                                    className="join-item btn btn-sm btn-outline"
                                    style={link.active ? { border: '2px solid currentColor', opacity: 1 } : {}}
                                >
                                    {link.label}
                                </button>
                            ))}

                            <button onClick={() => handlePageChange(users.next_page_url)} disabled={!users.next_page_url} className="join-item btn btn-sm btn-outline">›</button>
                            <button onClick={() => handlePageChange(users.last_page_url)} disabled={!users.next_page_url} className="join-item btn btn-sm btn-outline">»</button>
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
                                {isEditMode ? 'Edit Consigned User' : 'Add Consigned User'}
                            </h3>
                            <button className="btn btn-sm btn-circle btn-ghost" onClick={handleCloseModal}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitUser}>
                            {/* Username */}
                            <div className="form-control w-full mb-4">
                                <label className="label">
                                    <span className="label-text font-medium">Username</span>
                                    <span className="label-text-alt" style={{ color: 'oklch(var(--er))' }}>Required</span>
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

                            {/* Department */}
                            <SearchableSelect
                                label="Department"
                                required
                                selectedValue={formData.department}
                                searchValue={searchDepartments}
                                onSearchChange={setSearchDepartments}
                                filteredOptions={filteredDepartments}
                                onSelect={handleSelectDepartment}
                                onClear={() => { setFormData(p => ({ ...p, department: '' })); setSearchDepartments(''); }}
                                placeholder="Search department..."
                                noResultsText="No departments found"
                            />

                            {/* Product Line */}
                            <SearchableSelect
                                label="Product Line"
                                required
                                selectedValue={formData.prodline}
                                searchValue={searchProdlines}
                                onSearchChange={setSearchProdlines}
                                filteredOptions={filteredProdlines}
                                onSelect={handleSelectProdline}
                                onClear={() => { setFormData(p => ({ ...p, prodline: '' })); setSearchProdlines(''); }}
                                placeholder="Search product line..."
                                noResultsText="No product lines found"
                            />

                            {/* Password */}
                            <div className="form-control w-full mb-6">
                                <label className="label">
                                    <span className="label-text font-medium">
                                        Password{' '}
                                        {isEditMode && (
                                            <span className="text-xs text-base-content/50 ml-1">(leave blank to keep current)</span>
                                        )}
                                    </span>
                                    {!isEditMode && (
                                        <span className="label-text-alt" style={{ color: 'oklch(var(--er))' }}>Required</span>
                                    )}
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
                                <button type="button" onClick={handleCloseModal} className="btn" style={outlineBtnStyle(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn" style={outlineBtnStyle(true)}>
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