import { useEffect, useState } from "react";
import { FiHeart } from "react-icons/fi";
import api from "../services/api";
import FoodCard from "../components/common/FoodCard";
import Loader from "../components/common/Loader";
import EmptyState from "../components/common/EmptyState";
import Seo from "../components/common/Seo";

export default function Wishlist() {
  // null while loading, then the list of saved dishes.
  const [items, setItems] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .get("/users/wishlist")
      .then(({ data }) => {
        if (active) setItems(data.items);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, []);

  // Removing the heart on a card also removes the dish from this page.
  const handleWishlistChange = (itemId) => (saved) => {
    if (!saved) setItems((current) => current.filter((entry) => entry._id !== itemId));
  };

  return (
    <div className="container-page min-h-[60vh] py-10">
      <Seo title="My wishlist" description="Your saved Snipe&Bite favourites." />
      <p className="eyebrow">Your favourites</p>
      <h1 className="mt-2 text-3xl font-bold text-choco sm:text-4xl">My wishlist</h1>
      <p className="mt-2 text-sm text-gray-500">Dishes you save are kept with your account across visits.</p>

      <div className="mt-8">
        {items === null ? (
          <Loader label="Loading wishlist..." />
        ) : items.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <FoodCard key={item._id} item={item} onWishlistChange={handleWishlistChange(item._id)} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FiHeart />}
            title="No saved dishes yet"
            text="Tap the heart on any dish to keep it here."
            actionLabel="Explore the menu"
            actionTo="/menu"
          />
        )}
      </div>
    </div>
  );
}
