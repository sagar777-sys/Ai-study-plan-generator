import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DoubleRule, Eyebrow, Mark } from "@/components/vintage";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col"
    >
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-5">
            <Mark className="size-10 text-primary" />
          </div>
          <Eyebrow className="text-center">Missing folio</Eyebrow>
          <h1 className="font-display text-6xl tracking-tight mt-3">404</h1>
          <DoubleRule className="my-5 mx-auto max-w-[14rem]" />
          <p className="text-muted-foreground">
            This page was misfiled — or perhaps it was never written at all.
          </p>
          <div className="mt-7 flex justify-center">
            <Button asChild>
              <Link to="/">Back to the almanac</Link>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
