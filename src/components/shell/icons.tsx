"use client";

import {
  Bell,
  Boxes,
  Building2,
  Calculator,
  DownloadCloud,
  ChartColumn,
  Heart,
  PanelsTopLeft,
  House,
  LayoutDashboard,
  MessageCircle,
  Newspaper,
  Package,
  ReceiptText,
  ScanBarcode,
  Settings,
  Store,
  Undo2,
  Users,
  Wallet,
} from "lucide-react";

export const ICONS = {
  dashboard: LayoutDashboard,
  home: House,
  orders: ReceiptText,
  scan: ScanBarcode,
  products: Package,
  catalog: Store,
  stock: Boxes,
  resellers: Users,
  finance: ChartColumn,
  wallet: Wallet,
  returns: Undo2,
  messages: MessageCircle,
  news: Newspaper,
  settings: Settings,
  calculator: Calculator,
  heart: Heart,
  bell: Bell,
  suppliers: Building2,
  imports: DownloadCloud,
  landing: PanelsTopLeft,
} as const;

export type IconKey = keyof typeof ICONS;
