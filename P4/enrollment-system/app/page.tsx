import Link from "next/link";

export default function HomePage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Student Management</h1>
      <Link
        href="\login">
        Login    
      </Link>
      <br/>
      <Link
        href="\register">
        Register    
      </Link>
    </main>
  );
}