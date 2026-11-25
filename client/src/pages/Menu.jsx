import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiSearch } from "react-icons/fi";
import { fetchMenu } from "../features/menu/menuSlice";
import { fetchCategories } from "../features/category/categorySlice";
import { SORT_OPTIONS } from "../utils/constants";
import FoodCard from "../components/common/FoodCard";
import CategoryBar from "../components/common/CategoryBar";
import SearchBar from "../components/common/SearchBar";
import VegToggle from "../components/common/VegToggle";
import Pagination from "../components/common/Pagination";
import Loader from "../components/common/Loader";
import EmptyState from "../components/common/EmptyState";
import Seo from "../components/common/Seo";

export default function Menu() {
  const dispatch = useDispatch();
  const [params, setParams] = useSearchParams();
  const { items, loading, error, page, pages, total } = useSelector((state) => state.menu);
  const categories = useSelector((state) => state.category.list);

  const category = params.get("category") || "";
  const veg = params.get("veg") || "";
  const search = params.get("search") || "";
  const sort = params.get("sort") || "";
  const currentPage = Number(params.get("page")) || 1;

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchMenu({ category, veg, search, sort, page: currentPage, limit: 12 }));
  }, [dispatch, category, veg, search, sort, currentPage]);

  // Updates one filter and always goes back to the first page.
  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  return (
    <div className="container-page py-8">
      <Seo title="Menu" description="Browse the full Snipe&Bite menu and order online." />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-choco">Our menu</h1>
        <p className="text-sm text-gray-500">{total} dishes</p>
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
        <SearchBar value={search} onSearch={(value) => setFilter("search", value.trim())} />
        <VegToggle value={veg} onChange={(value) => setFilter("veg", value)} />
        <select value={sort} onChange={(event) => setFilter("sort", event.target.value)} className="input lg:w-52">
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <CategoryBar categories={categories} selected={category} onSelect={(id) => setFilter("category", id)} />
      </div>

      {loading ? (
        <Loader label="Loading menu..." />
      ) : error ? (
        <EmptyState title="Could not load the menu" text={error} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FiSearch />}
          title="No dishes found"
          text="Try a different search or remove some filters."
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <FoodCard key={item._id} item={item} />
            ))}
          </div>
          <Pagination page={page} pages={pages} onChange={(value) => setFilter("page", String(value))} />
        </>
      )}
    </div>
  );
}
