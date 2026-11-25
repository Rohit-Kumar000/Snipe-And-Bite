import { FiAlertCircle } from "react-icons/fi";
import EmptyState from "../components/common/EmptyState";
import Seo from "../components/common/Seo";

export default function NotFound() {
  return (
    <>
      <Seo title="Page not found" />
      <EmptyState
        icon={<FiAlertCircle />}
        title="Page not found"
        text="The page you are looking for does not exist or has been moved."
        actionLabel="Go to home"
        actionTo="/"
      />
    </>
  );
}
