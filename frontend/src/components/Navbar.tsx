import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/authStore";
import { LogOut, User, LayoutDashboard, Pencil, Trash } from "lucide-react";
import { EditProfileModal } from "@/components/EditProfileModalWithTabs";
import { DeleteAccountModal } from "@/components/DeleteAccountModal";

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleLogoClick = () => {
    if (isAuthenticated) navigate("/dashboard");
    else navigate("/");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <>
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-cinematic bg-background/80">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div onClick={handleLogoClick} className="flex items-center gap-2 cursor-pointer">
              <img
                src="/filmy-icon.ico"
                alt="Filmy Logo"
                className="w-9 h-9 object-contain transition-transform duration-300 hover:scale-110"
              />
              <span className="text-xl font-heading font-bold">filmy</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Link to="/explore">
                <Button variant="ghost" className="hidden sm:inline-flex">
                  Explore
                </Button>
              </Link>

              {isAuthenticated ? (
                <>
                  <Link to="/dashboard">
                    <Button variant="ghost" className="hidden sm:inline-flex">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="hidden sm:inline">
                          {user?.first_name} {user?.last_name}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuItem disabled className="opacity-75">
                        {user?.email}
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem onClick={() => setEditOpen(true)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit Profile
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
                        <Trash className="w-4 h-4 mr-2 text-red-500" />
                        <span className="text-red-500">Delete Account</span>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" className="hidden sm:inline-flex">
                      Login
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button className="gradient-cinematic hover:opacity-90 glow-primary">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* MODALS */}
      <EditProfileModal open={editOpen} onOpenChange={setEditOpen} />
      <DeleteAccountModal open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
};

export default Navbar;
