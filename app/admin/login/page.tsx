"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect old admin login to unified login page
export default function AdminLoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);
  return null;
}
