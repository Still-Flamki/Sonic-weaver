export function Footer() {
  return (
    <footer className="py-6 px-4 md:px-6 mt-auto">
      <div className="container mx-auto text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Sonic Weaver. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
