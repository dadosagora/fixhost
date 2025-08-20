import { useRole } from "../hooks/useRole";

export default function RoleGate({ allow = [], children }) {
  const role = useRole();
  if (!role) return null;
  return allow.includes(role) ? children : null;
}
