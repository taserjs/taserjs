import { api } from "@/client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const response = await api.$get();
  const data = await response.json();
  console.log(data);

  return (
    <div>
      <h1>Next App</h1>
      <p>{data.message}</p>
    </div>
  );
}
