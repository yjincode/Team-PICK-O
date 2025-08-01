import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const sidebarVariants = cva(
  "flex h-full w-full flex-col gap-4 bg-background p-6",
  {
    variants: {
      variant: {
        default: "border-r",
        ghost: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const sidebarHeaderVariants = cva("flex h-[60px] items-center px-2", {
  variants: {
    variant: {
      default: "",
      ghost: "",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

const sidebarContentVariants = cva("flex-1 overflow-auto", {
  variants: {
    variant: {
      default: "",
      ghost: "",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

const sidebarMenuVariants = cva("flex flex-col gap-2", {
  variants: {
    variant: {
      default: "",
      ghost: "",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

const sidebarMenuItemVariants = cva("", {
  variants: {
    variant: {
      default: "",
      ghost: "",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

const sidebarMenuButtonVariants = cva(
  "group relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
  {
    variants: {
      variant: {
        default: "",
        ghost: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const sidebarMenuSubVariants = cva("ml-4 mt-1 flex flex-col gap-1", {
  variants: {
    variant: {
      default: "",
      ghost: "",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

const sidebarMenuSubButtonVariants = cva(
  "group relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
  {
    variants: {
      variant: {
        default: "",
        ghost: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const sidebarMenuSubItemVariants = cva("", {
  variants: {
    variant: {
      default: "",
      ghost: "",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

const Sidebar = React.forwardRef(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(sidebarVariants({ variant }), className)}
      {...props}
    />
  )
)
Sidebar.displayName = "Sidebar"

const SidebarHeader = React.forwardRef(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(sidebarHeaderVariants({ variant }), className)}
      {...props}
    />
  )
)
SidebarHeader.displayName = "SidebarHeader"

const SidebarContent = React.forwardRef(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(sidebarContentVariants({ variant }), className)}
      {...props}
    />
  )
)
SidebarContent.displayName = "SidebarContent"

const SidebarMenu = React.forwardRef(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(sidebarMenuVariants({ variant }), className)}
      {...props}
    />
  )
)
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(sidebarMenuItemVariants({ variant }), className)}
      {...props}
    />
  )
)
SidebarMenuItem.displayName = "SidebarMenuItem"

const SidebarMenuButton = React.forwardRef(
  ({ className, variant, isActive, asChild, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        sidebarMenuButtonVariants({ variant }),
        isActive && "bg-accent text-accent-foreground",
        className
      )}
      {...props}
    />
  )
)
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarMenuSub = React.forwardRef(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(sidebarMenuSubVariants({ variant }), className)}
      {...props}
    />
  )
)
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubButton = React.forwardRef(
  ({ className, variant, isActive, asChild, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        sidebarMenuSubButtonVariants({ variant }),
        isActive && "bg-accent text-accent-foreground",
        className
      )}
      {...props}
    />
  )
)
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

const SidebarMenuSubItem = React.forwardRef(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(sidebarMenuSubItemVariants({ variant }), className)}
      {...props}
    />
  )
)
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} 