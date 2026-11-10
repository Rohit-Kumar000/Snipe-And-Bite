// The only shape in which a user account is ever sent to a browser.
export const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  designation: user.designation || "",
  avatar: user.avatar?.url || "",
  cover: user.cover?.url || "",
  loyaltyPoints: user.loyaltyPoints,
  wishlist: (user.wishlist || []).map((item) => String(item?._id || item)),
  addresses: user.addresses,
  emailVerified: Boolean(user.emailVerified),
  linkedProviders: (user.oauth || []).map((o) => o.provider),
  mustChangePassword: Boolean(user.mustChangePassword),
  twoFactorEnabled: Boolean(user.twoFactor?.enabled),
  createdAt: user.createdAt,
});
