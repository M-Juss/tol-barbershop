import { authFetch } from "@/lib/api";

export interface Module {
  id: number;
  key: string;
  name: string;
}

export interface Role {
  id: number;
  name: string;
  modules: Module[];
  created_at: string;
}

export interface CreateRoleData {
  name: string;
  module_ids: number[];
}

const API = process.env.NEXT_PUBLIC_API_URL;

export const getModules = async (): Promise<Module[]> => {
  const response = await authFetch(`${API}/modules`);
  return response.data as Module[];
};

export const getRoles = async (): Promise<Role[]> => {
  const response = await authFetch(`${API}/roles`);
  return response.data as Role[];
};

export const createRole = async (data: CreateRoleData): Promise<Role> => {
  const response = await authFetch(`${API}/roles`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.data as Role;
};

export const updateRole = async (id: number, data: CreateRoleData): Promise<Role> => {
  const response = await authFetch(`${API}/roles/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return response.data as Role;
};

export const deleteRole = async (id: number): Promise<void> => {
  await authFetch(`${API}/roles/${id}`, {
    method: "DELETE",
  });
};
