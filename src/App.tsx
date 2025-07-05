import Home from "./pages/Home";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "./components/ErrorBoundary"; // ✅ No brackets

function App() {
  return (
    <ErrorBoundary>
      <Toaster position="top-center" />
      <div
        className="min-h-screen bg-cover bg-center flex items-center justify-center px-4"
        style={{ backgroundImage: "url('/bg.png')" }}
      >
        <Home />
      </div>
    </ErrorBoundary>
  );
}

export default App;
