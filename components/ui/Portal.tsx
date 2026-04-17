"use client";

import { useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";

interface PortalProps {
  children: ReactNode;
  selector?: string;
}

/**
 * A reusable Portal component that renders children into document.body
 * This solves z-index and overflow-hidden issues in nested layouts.
 */
export default function Portal({ children, selector = "body" }: PortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  const element = document.querySelector(selector);
  if (!element) return null;

  return createPortal(children, element);
}
