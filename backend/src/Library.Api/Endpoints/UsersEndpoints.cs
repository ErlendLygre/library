using System.Security.Claims;
using Library.Api.Auth;
using Library.Api.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Library.Api.Endpoints;

public static class UsersEndpoints
{
    public static RouteGroupBuilder MapUsersEndpoints(this RouteGroupBuilder api)
    {
        var group = api.MapGroup("/users").WithTags("Users").RequireAuthorization(p => p.RequireRole(Roles.Admin));

        group.MapGet("/", async (UserManager<AppUser> users) =>
        {
            var admins = (await users.GetUsersInRoleAsync(Roles.Admin)).Select(u => u.Id).ToHashSet();
            var all = await users.Users.OrderBy(u => u.DisplayName).ToListAsync();
            return all.Select(u => new UserResponse(u.Id, u.Email!, u.DisplayName, admins.Contains(u.Id), u.CreatedAt));
        });

        group.MapPost("/", async (CreateUserRequest req, UserManager<AppUser> users) =>
        {
            if (await users.FindByEmailAsync(req.Email) is not null)
                return Results.Conflict(new { message = "A user with that email already exists." });

            var user = new AppUser
            {
                UserName = req.Email,
                Email = req.Email,
                EmailConfirmed = true,
                DisplayName = req.DisplayName.Trim(),
            };
            var result = await users.CreateAsync(user, req.Password);
            if (!result.Succeeded)
                return Results.ValidationProblem(result.Errors.ToDictionary(e => e.Code, e => new[] { e.Description }));

            if (req.IsAdmin)
                await users.AddToRoleAsync(user, Roles.Admin);

            return Results.Created($"/api/users/{user.Id}",
                new UserResponse(user.Id, user.Email, user.DisplayName, req.IsAdmin, user.CreatedAt));
        });

        group.MapDelete("/{id}", async (string id, ClaimsPrincipal principal, UserManager<AppUser> users) =>
        {
            if (id == principal.UserId())
                return Results.BadRequest(new { message = "You cannot delete your own account." });

            var user = await users.FindByIdAsync(id);
            if (user is null) return Results.NotFound();

            await users.DeleteAsync(user);
            return Results.NoContent();
        });

        return api;
    }
}
