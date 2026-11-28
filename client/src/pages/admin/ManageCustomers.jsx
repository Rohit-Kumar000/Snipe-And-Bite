import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { fetchCustomers, toggleBlockUser } from "../../features/admin/adminSlice";
import { formatPrice } from "../../utils/formatPrice";
import { formatDate } from "../../utils/formatDate";
import SearchBar from "../../components/common/SearchBar";
import Pagination from "../../components/common/Pagination";
import Loader from "../../components/common/Loader";
import Seo from "../../components/common/Seo";

export default function ManageCustomers() {
  const dispatch = useDispatch();
  const { customers, customersPages, customersLoading } = useSelector((state) => state.admin);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(() => dispatch(fetchCustomers({ search, page, limit: 15 })), [dispatch, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleBlock = async (customer) => {
    try {
      const result = await dispatch(toggleBlockUser(customer._id)).unwrap();
      toast.success(result.isBlocked ? `${customer.name} is blocked` : `${customer.name} is unblocked`);
    } catch (message) {
      toast.error(message);
    }
  };

  return (
    <div className="space-y-5">
      <Seo title="Customers" />
      <h1 className="text-2xl font-bold text-choco">Customers</h1>
      <SearchBar value={search} onSearch={(value) => { setSearch(value.trim()); setPage(1); }} placeholder="Search by name, email or phone" />

      {customersLoading && customers.length === 0 ? (
        <Loader />
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Customer</th><th>Phone</th><th>Orders</th><th>Spent</th><th>Points</th><th>Joined</th><th className="text-right">Action</th></tr></thead>
            <tbody>
              {customers.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-gray-500">No customers found.</td></tr>}
              {customers.map((c) => (
                <tr key={c._id}>
                  <td>
                    <p className="font-semibold text-choco">
                      {c.name} {c.isBlocked && <span className="badge ml-1 bg-red-100 text-red-700">Blocked</span>}
                    </p>
                    <p className="text-xs text-gray-500">{c.email}</p>
                  </td>
                  <td>{c.phone || "-"}</td>
                  <td>{c.orders}</td>
                  <td>{formatPrice(c.spent)}</td>
                  <td>{c.loyaltyPoints}</td>
                  <td>{formatDate(c.createdAt)}</td>
                  <td className="text-right">
                    <button type="button" className={c.isBlocked ? "btn-outline btn-sm" : "btn-danger btn-sm"} onClick={() => handleBlock(c)}>
                      {c.isBlocked ? "Unblock" : "Block"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={customersPages} onChange={setPage} />
    </div>
  );
}
