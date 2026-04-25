import { useState } from "react";
import { submitPoll } from "../services/api";

export default function PollPage() {
  const [status, setStatus] = useState("");

  const handleSubmit = async () => {
    await submitPoll({ status });
    alert("Submitted!");
  };

  return (
    <div className="p-5">
      <h1>Poll</h1>

      <select onChange={(e) => setStatus(e.target.value)}>
        <option>Fully Prepared</option>
        <option>Need Some Help</option>
      </select>

      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}