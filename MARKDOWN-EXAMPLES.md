# Markdown Examples for Talk Tracks

This file shows examples of Markdown formatting you can use in your talk tracks.

## Example 1: Dashboard Demo

```markdown
# Dashboard Overview

## Key Features to Highlight
- **Real-time metrics** - Updated every second
- *Custom queries* - Build complex filters
- Time range selector - Go back up to 15 months

## Demo Flow
1. Show the main dashboard
2. Point out the **custom widgets**
3. Demonstrate filtering by environment
4. Show time range controls

> 💡 Remember to mention the new AI-powered anomaly detection!

---

**Transition:** "Now let's look at the APM services..."
```

## Example 2: APM Services

```markdown
# APM Services Demo

## Introduction
Welcome to the APM Services page where you can:
- Monitor service health
- Track request rates
- Analyze latency patterns

## Important Metrics
1. **P95 Latency**: < 200ms ✓
2. **Error Rate**: 0.01%
3. **Throughput**: 50K req/sec

### Service Dependencies
Show the service map and explain:
- *Upstream services* - API Gateway, Auth Service
- *Downstream services* - Database, Cache layer
- **Critical path** - Highlight the main request flow

---

## Common Questions

> Q: What's the difference between P95 and P99?
> A: P95 means 95% of requests are faster than this value

### Troubleshooting Tips
- Check for recent deployments
- Look at error logs
- Compare with baseline metrics
```

## Example 3: Logs Demo

```markdown
# Logs Demo

## Quick Stats
- **Volume**: 1M logs/minute
- **Retention**: 15 days (hot), 1 year (archive)
- **Search time**: < 1 second

## Demo Steps

### 1. Basic Search
Show how to search for:
```
service:web-app status:error
```

### 2. Time Selection
- Use relative time: `Past 15 minutes`
- Show date picker for historical analysis

### 3. Log Analytics
**Key features:**
- Automatic pattern detection
- Field extraction
- Custom parsing rules

### 4. Create Monitor
Show how to set up alerts based on log patterns

---

> 🎯 **Pro Tip**: Use facets to quickly filter by common attributes

## Transition
"Let's move on to the Infrastructure view..."
```

## Example 4: Quick Reference Card

```markdown
# Quick Reference

## Product Positioning
- ~~Traditional monitoring~~ → **Full observability**
- Metrics + Traces + Logs in *one platform*
- **AI-powered insights** out of the box

## Pricing Highlights
1. Usage-based pricing
2. Free tier available
3. Enterprise features included

## Competitive Advantages
- **Speed**: 10x faster queries
- **Scale**: Handles billions of events
- **Integration**: 450+ integrations

---

**Remember**: Always connect features to business value!
```

## Example 5: Using Links and Code

```markdown
# Technical Deep Dive

## Architecture Overview

Our infrastructure runs on:
- **Frontend**: React + TypeScript
- **Backend**: Go microservices
- **Database**: PostgreSQL + Redis

### Sample Query
To find slow requests, use:
```
SELECT * FROM traces WHERE duration > 1000
```

### Useful Links
- [Documentation](https://docs.datadoghq.com)
- [API Reference](https://docs.datadoghq.com/api)
- [Status Page](https://status.datadoghq.com)

## Performance Benchmarks

| Metric | Value |
|--------|-------|
| Queries/sec | 100K |
| P95 Latency | 50ms |
| Uptime | 99.99% |
```

## Tips for Best Results

1. **Use headings** to organize your content hierarchically
2. **Bold important numbers** and key terms
3. **Italic** for emphasis or questions
4. **Lists** for steps and bullet points
5. **Blockquotes** for tips, warnings, or memorable quotes
6. **Horizontal rules** (`---`) to separate sections
7. **Code formatting** for technical terms, commands, or examples

## Copy and Paste

You can copy any of these examples and paste them into your talk track configuration!
The popup window will render them with proper formatting automatically.

