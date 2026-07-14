export type PromoType = "common" | "box" | "fixed";

export type ProductVariant = {
  sku: string;
  specs?: string;
  min?: string | number;
  qty?: string | number;
  price?: string | number;
  productdescription?: string;
  properties?: Array<{
    propertyname: string;
    propertyvalue: string | number;
  }>;
};

export type Product = {
  id?: string | number;
  title: string;
  brand?: string | number;
  description?: string;
  variants: ProductVariant[];
};

export type SheetRow = {
  sku: string;
  title?: string;
  discount?: string;
  conditions?: string;
  basePrice?: string;
  leafletName?: string;
  groupName?: string;
  order?: number;
  boxPrice?: string;
  multiplicity?: string;
  raw: Record<string, string>;
};

export type ProductGroup = {
  cardType: "default" | "box";
  mainSku: string;
  headerName: string;
  descriptionText: string;
  brandId?: string;
  leafletName?: string;
  discountText?: string;
  discountInfoText?: string;
  surpriseText?: string;
  boxPriceText?: string;
  boxQtyText?: string;
  productUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  items: Array<{
    sku: string;
    specs: string;
    min: string;
    qty: string;
    price: string;
    discount?: string;
    boxPrice?: string;
    multiplicity?: string;
  }>;
};

export type LeafletRun = {
  title: string;
  promoType: PromoType;
  groups: ProductGroup[];
  isCommon: boolean;
};

export type GenerationResult = {
  id: string;
  pdfPath: string;
  htmlPath: string;
  fileName: string;
  leaflets: LeafletRun[];
};
