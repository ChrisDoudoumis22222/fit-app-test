export default function DashSection({ id, show, children }) {
  return (
    <section id={id} className={`scroll-mt-28 ${show ? "" : "hidden"}`}>
      {children}
    </section>
  );
}