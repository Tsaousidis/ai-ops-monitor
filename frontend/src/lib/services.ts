import api from "./api";

export async function fetchServices() {
  const response = await api.get("/services");

  return response.data;
}