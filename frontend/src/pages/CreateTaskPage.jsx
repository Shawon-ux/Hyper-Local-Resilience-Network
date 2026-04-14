import CreateTaskForm from "../components/CreateTaskForm";

const CreateTaskPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-slate-900">
            Post a new micro-task
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Use this page to create a task from your profile location or current
            browser location.
          </p>
        </div>
        <CreateTaskForm />
      </div>
    </div>
  );
};

export default CreateTaskPage;
