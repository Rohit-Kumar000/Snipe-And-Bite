import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import api, { getErrorMessage } from "../services/api";
import { loadUser } from "../features/auth/authSlice";
import Seo from "../components/common/Seo";

export default function VerifyEmail() {
  const { token } = useParams();
  const dispatch = useDispatch();
  const signedIn = useSelector((state) => Boolean(state.auth.user));
  const [state, setState] = useState({ status: "loading", message: "" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api.post(`/auth/verify-email/${token}`)
      .then(({ data }) => { setState({ status: "ok", message: data.message }); if (signedIn) dispatch(loadUser()); })
      .catch((error) => setState({ status: "error", message: getErrorMessage(error) }));
  }, [token, dispatch, signedIn]);

  return (
    <div className="container-page flex min-h-[50vh] items-center justify-center py-16">
      <Seo title="Confirm email" />
      <div className="card max-w-md p-8 text-center">
        {state.status === "loading" && <p>Confirming your email...</p>}
        {state.status === "ok" && <><h1 className="text-2xl font-bold">Email confirmed</h1><p className="mt-2 text-sm text-gray-500">{state.message}</p><Link to="/" className="btn-primary mt-6">Continue</Link></>}
        {state.status === "error" && <><h1 className="text-2xl font-bold">Link not valid</h1><p className="mt-2 text-sm text-gray-500">{state.message}</p><Link to="/profile" className="btn-primary mt-6">Request a new link</Link></>}
      </div>
    </div>
  );
}
