import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage } from "@inertiajs/react";

export default function Approval({ tableData, tableFilters }) {
    const props = usePage().props;

    return (
        <AuthenticatedLayout>
            <Head title="Approval" />

            <h1 className="text-2xl font-bold">Approval</h1>

            {/* <pre>{JSON.stringify(props.emp_data, null, 2)}</pre> */}
        </AuthenticatedLayout>
    );
}