// React 19 moves <title> and <meta> rendered anywhere in the tree into the document head.
export default function Seo({ title, description }) {
  const fullTitle = title ? `${title} | Snipe&Bite` : "Snipe&Bite | Food Delivery Hub";
  return (
    <>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
    </>
  );
}
