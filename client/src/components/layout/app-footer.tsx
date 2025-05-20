import { Link } from "wouter";
import { HelpCircle, BookOpen, Mail } from "lucide-react";

export default function AppFooter() {
  return (
    <footer className="bg-white border-t border-neutral-200">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 md:flex md:items-center md:justify-between">
        <div className="flex justify-center space-x-6 md:order-2">
          <Link href="/help">
            <a className="text-neutral-500 hover:text-neutral-700">
              <span className="sr-only">Support</span>
              <HelpCircle className="h-5 w-5" />
            </a>
          </Link>
          <Link href="/docs">
            <a className="text-neutral-500 hover:text-neutral-700">
              <span className="sr-only">Documentation</span>
              <BookOpen className="h-5 w-5" />
            </a>
          </Link>
          <Link href="/contact">
            <a className="text-neutral-500 hover:text-neutral-700">
              <span className="sr-only">Contact</span>
              <Mail className="h-5 w-5" />
            </a>
          </Link>
        </div>
        <div className="mt-4 md:mt-0 md:order-1">
          <p className="text-center text-sm text-neutral-500">
            &copy; {new Date().getFullYear()} SkillTrack. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
