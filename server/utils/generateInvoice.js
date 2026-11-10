import PDFDocument from "pdfkit";

const money = (n) => `Rs. ${Number(n).toFixed(2)}`;

// Streams a PDF invoice for the order into the HTTP response.
// The standard PDF fonts do not contain the rupee symbol, so "Rs." is used.
const streamInvoice = (order, settings, res) => {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${order.orderNumber}.pdf"`);
  doc.pipe(res);

  const left = 50;
  const right = 545;

  // Header
  doc.fillColor("#e31b23").fontSize(22).font("Helvetica-Bold").text(settings.restaurantName, left, 50);
  doc.fillColor("#444").fontSize(9).font("Helvetica");
  if (settings.address) doc.text(settings.address, left, 78, { width: 260 });
  if (settings.phone) doc.text(`Phone: ${settings.phone}`);
  if (settings.email) doc.text(`Email: ${settings.email}`);
  if (settings.gstNumber) doc.text(`GSTIN: ${settings.gstNumber}`);

  doc.fillColor("#111").fontSize(18).font("Helvetica-Bold").text("INVOICE", 380, 50, { width: 165, align: "right" });
  doc.fontSize(9).font("Helvetica").fillColor("#444");
  doc.text(`Invoice no: ${order.orderNumber}`, 380, 78, { width: 165, align: "right" });
  doc.text(`Date: ${new Date(order.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`, { width: 165, align: "right" });
  doc.text(`Payment: ${order.paymentMethod} (${order.paymentStatus})`, { width: 165, align: "right" });

  // Customer
  let y = 150;
  doc.moveTo(left, y).lineTo(right, y).strokeColor("#dddddd").stroke();
  y += 10;
  doc.fillColor("#111").font("Helvetica-Bold").fontSize(10).text("Billed to", left, y);
  doc.font("Helvetica").fillColor("#444").fontSize(9);
  doc.text(order.contact.name, left, y + 14);
  doc.text(`Phone: ${order.contact.phone}`);
  doc.text(`Order type: ${order.orderType}${order.tableNumber ? ` (table ${order.tableNumber})` : ""}`);
  if (order.orderType === "delivery" && order.address?.line1) {
    const a = order.address;
    doc.text([a.line1, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(", "), { width: 300 });
  }

  // Items table
  y = Math.max(doc.y + 16, 250);
  const drawHeader = () => {
    doc.rect(left, y, right - left, 22).fill("#4a1d0a");
    doc.fillColor("#fff").font("Helvetica-Bold").fontSize(9);
    doc.text("Item", left + 8, y + 7, { width: 260 });
    doc.text("Qty", 330, y + 7, { width: 40, align: "center" });
    doc.text("Rate", 375, y + 7, { width: 80, align: "right" });
    doc.text("Amount", 460, y + 7, { width: 80, align: "right" });
    y += 28;
  };
  drawHeader();

  doc.font("Helvetica").fontSize(9).fillColor("#111");
  for (const item of order.items) {
    const addOnText = item.addOns?.length ? `+ ${item.addOns.map((a) => a.name).join(", ")}` : "";
    const rowHeight = addOnText ? 30 : 18;
    if (y + rowHeight > 740) {
      doc.addPage();
      y = 50;
      drawHeader();
      doc.font("Helvetica").fontSize(9).fillColor("#111");
    }
    const addOnUnit = (item.addOns || []).reduce((s, a) => s + a.price, 0);
    doc.text(item.name, left + 8, y, { width: 260 });
    if (addOnText) doc.fillColor("#777").fontSize(8).text(addOnText, left + 8, y + 11, { width: 260 }).fillColor("#111").fontSize(9);
    doc.text(String(item.qty), 330, y, { width: 40, align: "center" });
    doc.text(money(item.price + addOnUnit), 375, y, { width: 80, align: "right" });
    doc.text(money(item.lineTotal), 460, y, { width: 80, align: "right" });
    y += rowHeight;
    doc.moveTo(left, y - 4).lineTo(right, y - 4).strokeColor("#eeeeee").stroke();
  }

  // Totals
  if (y + 150 > 780) {
    doc.addPage();
    y = 50;
  }
  y += 10;
  const line = (label, value, bold = false) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 12 : 9).fillColor("#111");
    doc.text(label, 330, y, { width: 120 });
    doc.text(value, 440, y, { width: 100, align: "right" });
    y += bold ? 20 : 15;
  };
  line("Items total", money(order.itemsTotal));
  if (order.discount > 0) line(`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`, `- ${money(order.discount)}`);
  if (order.pointsRedeemed > 0) line("Loyalty points", `- ${money(order.pointsRedeemed)}`);
  line(`Tax (GST ${settings.taxPercent}%)`, money(order.tax));
  if (order.deliveryCharge > 0) line("Delivery charge", money(order.deliveryCharge));
  doc.moveTo(330, y).lineTo(right, y).strokeColor("#dddddd").stroke();
  y += 6;
  line("Grand total", money(order.totalAmount), true);

  doc.font("Helvetica").fontSize(8).fillColor("#777").text("Thank you for ordering with us.", left, y + 30, { width: right - left, align: "center" });

  doc.end();
};

export default streamInvoice;
