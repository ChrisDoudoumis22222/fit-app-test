import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import UserMenu from "../components/UserMenu";
import { SERVICE_PLACEHOLDER } from "../utils/placeholderServiceImg";

export default function ServiceDetailPage() {
  const { id } = useParams();                // service UUID in the URL
  const [svc, setSvc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error , setError ] = useState("");

  /* fetch one service + trainer’s profile */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*, trainer:profiles(full_name)")
        .eq("id", id)
        .single();
      if (error) setError(error.message);
      else       setSvc(data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <p>Loading…</p>;
  if (error)   return <p style={{ color: "red" }}>{error}</p>;
  if (!svc)    return <p>Service not found.</p>;

  return (
    <>
      <UserMenu />

      <section style={styles.card}>
        <img
          src={svc.image_url || SERVICE_PLACEHOLDER}
          alt=""
          style={styles.img}
        />

        <h2>{svc.title}</h2>
        <p>
          <strong>Price:</strong> €{svc.price}
        </p>
        <p>{svc.descr}</p>

        {svc.tags?.length ? (
          <p>
            <em>{svc.tags.join(", ")}</em>
          </p>
        ) : null}

        <p style={{ marginTop: 12 }}>
          Uploaded by <strong>{svc.trainer?.full_name || "Trainer"}</strong>
          {svc.is_virtual && " · (Virtual session)"}
        </p>

        {/* placeholder booking button */}
        <button
          style={styles.bookBtn}
          onClick={() => alert("Booking flow coming soon…")}
        >
          Book now
        </button>
      </section>
    </>
  );
}

const styles = {
  card: {
    maxWidth: 640,
    margin: "40px auto",
    padding: 16,
    border: "1px solid #ddd",
    textAlign: "center",
  },
  img: { width: "100%", height: 320, objectFit: "cover" },
  bookBtn: { marginTop: 20, padding: "10px 24px", fontSize: 16 },
};
