const [resources, setResources] = useState([]);

useEffect(() => {
  // 1. Initial Load
  axios.get('/api/resources').then(res => setResources(res.data));

  // 2. Real-time Listener (Feature-2)
  const socket = io('http://localhost:5000');
  socket.on('resourceUpdate', (updatedData) => {
    setResources(updatedData); // This makes it change automatically!
  });

  return () => socket.disconnect();
}, []);

// ... inside your return/JSX ...
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {resources.length > 0 ? (
    resources.map((res) => {
      // The Calculation Logic (Feature-1)
      const remaining = res.totalStock - res.consumed;
      const percent = (remaining / res.totalStock) * 100;
      
      let statusLabel = "Low";
      let colorClass = "bg-green-500";
      if (percent <= 20) { statusLabel = "High"; colorClass = "bg-red-500"; }
      else if (percent <= 50) { statusLabel = "Medium"; colorClass = "bg-yellow-500"; }

      return (
        <div key={res._id} className="p-4 border rounded-xl bg-white shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold capitalize">{res.name}</h4>
            <span className={`${colorClass} text-white text-[10px] px-2 py-1 rounded-full font-bold`}>
              {statusLabel} DEMAND
            </span>
          </div>
          <p className="text-xs text-gray-500">{remaining} / {res.totalStock} {res.unit} available</p>
          <div className="w-full bg-gray-100 h-2 mt-2 rounded-full overflow-hidden">
            <div className={`h-full ${colorClass}`} style={{ width: `${percent}%` }}></div>
          </div>
        </div>
      );
    })
  ) : (
    <p className="text-slate-400 text-sm italic">Initializing live community data...</p>
  )}
</div>